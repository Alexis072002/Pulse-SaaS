import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma, ReportStatus, ReportType, type Report } from "@prisma/client";
import { CacheService } from "~/modules/analytics/cache.service";
import { Period } from "~/modules/analytics/dto/get-overview.dto";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { JOBS } from "~/modules/queue/constants/queue.constants";
import { QueueService } from "~/modules/queue/queue.service";
import { EmailService } from "~/modules/reports/email/email.service";
import { PdfService } from "~/modules/reports/pdf/pdf.service";
import { PrismaService } from "~/prisma/prisma.service";

const REPORTS_CACHE_TTL_SECONDS = 60;
const REPORT_OUTPUT_DIR = "/tmp/pulse-reports";

interface GenerateReportJobPayload {
  reportId: string;
  userId: string;
}

interface SendReportEmailJobPayload {
  reportId: string;
  userId: string;
}

interface ReportPeriodRange {
  start: Date;
  end: Date;
}

export interface ListReportsFilters {
  type?: ReportType;
  status?: ReportStatus;
}

export interface ReportListItem {
  id: string;
  userId: string;
  type: ReportType;
  status: ReportStatus;
  periodStart: Date;
  periodEnd: Date;
  pdfUrl: string | null;
  aiDigest: string | null;
  errorMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportDownloadPayload {
  fileName: string;
  content: Buffer;
}

@Injectable()
export class ReportsService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService,
    private readonly analyticsService: AnalyticsService,
    private readonly cacheService: CacheService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService
  ) {}

  onModuleInit(): void {
    this.queueService.register<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, async (payload) => {
      await this.processReportGeneration(payload);
    });

    this.queueService.register<SendReportEmailJobPayload>(JOBS.SEND_REPORT, async (payload) => {
      await this.processReportEmail(payload);
    });
  }

  async listReports(userId: string, filters: ListReportsFilters = {}): Promise<ReportListItem[]> {
    const cacheKey = this.getListCacheKey(userId, filters);
    return this.cacheService.wrap(cacheKey, REPORTS_CACHE_TTL_SECONDS, async () => {
      const where: Prisma.ReportWhereInput = {
        userId
      };

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      const reports = await this.prismaService.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50
      });

      return reports.map((report) => this.toListItem(report));
    });
  }

  async createReport(userId: string, type: ReportType = ReportType.WEEKLY): Promise<ReportListItem> {
    const range = this.computeRange(type);

    const report = await this.prismaService.report.create({
      data: {
        userId,
        type,
        status: ReportStatus.PENDING,
        periodStart: range.start,
        periodEnd: range.end
      }
    });

    await this.invalidateListCache(userId);
    await this.queueService.enqueue<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, {
      reportId: report.id,
      userId
    });

    return this.toListItem(report);
  }

  async retryReport(reportId: string, userId: string): Promise<ReportListItem> {
    const report = await this.getOwnedReport(reportId, userId);
    if (report.status === ReportStatus.PENDING) {
      throw new BadRequestException("Report is already in progress.");
    }

    const reset = await this.prismaService.report.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.PENDING,
        errorMsg: null,
        pdfUrl: null
      }
    });

    await this.invalidateListCache(userId);
    await this.queueService.enqueue<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, {
      reportId: reset.id,
      userId
    });

    return this.toListItem(reset);
  }

  async getDownload(reportId: string, userId: string): Promise<ReportDownloadPayload> {
    const report = await this.getOwnedReport(reportId, userId);
    if (report.status !== ReportStatus.DONE || !report.pdfUrl) {
      throw new BadRequestException("Report PDF is not available yet.");
    }

    const content = await readFile(report.pdfUrl);
    const fileName = `pulse-${report.type.toLowerCase()}-${this.toIsoDate(report.periodEnd)}.pdf`;
    return { fileName, content };
  }

  private async processReportGeneration(payload: GenerateReportJobPayload): Promise<void> {
    const report = await this.prismaService.report.findUnique({
      where: { id: payload.reportId }
    });
    if (!report || report.userId !== payload.userId) {
      return;
    }

    try {
      const period = report.type === ReportType.WEEKLY ? Period.SEVEN_DAYS : Period.THIRTY_DAYS;
      const [overview, youtube, ga4, lastDigest] = await Promise.all([
        this.analyticsService.getOverview(period, report.userId),
        this.analyticsService.getYoutubeStats(period, report.userId),
        this.analyticsService.getGa4Stats(period, report.userId).catch(() => null),
        this.prismaService.aiDigest.findFirst({
          where: { userId: report.userId },
          orderBy: { weekStart: "desc" }
        })
      ]);

      const digest = (lastDigest?.content ?? "").trim() || this.composeDigest(
        report.type,
        overview.youtubeViews,
        overview.webSessions,
        overview.pulseScore,
        overview.youtubeViewsDelta,
        overview.webSessionsDelta
      );

      const pdfContent = await this.pdfService.render({
        title: "Pulse Analytics Report",
        periodLabel: `${this.toIsoDate(report.periodStart)} to ${this.toIsoDate(report.periodEnd)}`,
        generatedAt: new Date().toISOString(),
        kpis: [
          { label: "YouTube views", value: String(overview.youtubeViews) },
          { label: "Subscribers gained", value: String(overview.subscribersGained) },
          { label: "Web sessions", value: String(overview.webSessions) },
          { label: "Pulse score", value: String(overview.pulseScore) },
          { label: "Average retention", value: `${youtube.averageRetention.toFixed(1)}%` },
          { label: "New users", value: ga4 ? String(ga4.newUsers) : "N/A" }
        ],
        digest
      });

      const pdfUrl = await this.persistPdf(report.id, pdfContent);

      await this.prismaService.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.DONE,
          pdfUrl,
          aiDigest: digest,
          errorMsg: null
        }
      });

      await this.invalidateListCache(report.userId);
      await this.queueService.enqueue<SendReportEmailJobPayload>(JOBS.SEND_REPORT, {
        reportId: report.id,
        userId: report.userId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report generation failed.";
      await this.prismaService.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.FAILED,
          errorMsg: message
        }
      });
      await this.invalidateListCache(report.userId);
    }
  }

  private async processReportEmail(payload: SendReportEmailJobPayload): Promise<void> {
    const report = await this.prismaService.report.findUnique({
      where: { id: payload.reportId }
    });
    if (!report || report.userId !== payload.userId || report.status !== ReportStatus.DONE) {
      return;
    }

    await this.emailService.sendReportReadyEmail({
      userId: report.userId,
      reportId: report.id,
      reportType: report.type
    });
  }

  private async getOwnedReport(reportId: string, userId: string): Promise<Report> {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId }
    });

    if (!report || report.userId !== userId) {
      throw new NotFoundException("Report not found.");
    }

    return report;
  }

  private toListItem(report: Report): ReportListItem {
    return {
      id: report.id,
      userId: report.userId,
      type: report.type,
      status: report.status,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      pdfUrl: report.pdfUrl,
      aiDigest: report.aiDigest,
      errorMsg: report.errorMsg,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }

  private computeRange(type: ReportType): ReportPeriodRange {
    const dayCount = type === ReportType.WEEKLY ? 7 : 30;
    const end = this.todayUtc();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (dayCount - 1));

    return {
      start,
      end
    };
  }

  private todayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private async persistPdf(reportId: string, pdfContent: Buffer): Promise<string> {
    await mkdir(REPORT_OUTPUT_DIR, { recursive: true });
    const filePath = join(REPORT_OUTPUT_DIR, `${reportId}.pdf`);
    await writeFile(filePath, pdfContent);
    return filePath;
  }

  private async invalidateListCache(userId: string): Promise<void> {
    await this.cacheService.del(`pulse:reports:${userId}:list:*`);
  }

  private getListCacheKey(userId: string, filters: ListReportsFilters): string {
    const type = filters.type ?? "ALL";
    const status = filters.status ?? "ALL";
    return `pulse:reports:${userId}:list:${type}:${status}`;
  }

  private composeDigest(
    type: ReportType,
    youtubeViews: number,
    webSessions: number,
    pulseScore: number,
    youtubeDelta: number,
    sessionsDelta: number
  ): string {
    const scope = type === ReportType.WEEKLY ? "weekly" : "monthly";
    const trendYouTube = youtubeDelta >= 0 ? "up" : "down";
    const trendWeb = sessionsDelta >= 0 ? "up" : "down";

    return [
      `This ${scope} report shows YouTube reach ${trendYouTube} at ${youtubeViews} views, while web traffic is ${trendWeb} at ${webSessions} sessions.`,
      `Pulse score is currently ${pulseScore}, indicating the global momentum of your acquisition funnel.`,
      "Focus next cycle on the topics that drive both retention and click-through to your website."
    ].join(" ");
  }
}

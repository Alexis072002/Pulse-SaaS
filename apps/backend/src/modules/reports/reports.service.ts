import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import {
  DeliveryChannel,
  DeliveryStatus,
  Prisma,
  ReportStatus,
  ReportType,
  type Report,
  type ReportDelivery,
  type ReportSchedule
} from "@prisma/client";
import { AuditService } from "~/modules/audit/audit.service";
import { DigestService } from "~/modules/ai/digest/digest.service";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { CacheService } from "~/modules/analytics/cache.service";
import { Period } from "~/modules/analytics/dto/get-overview.dto";
import { JOBS } from "~/modules/queue/constants/queue.constants";
import { QueueService } from "~/modules/queue/queue.service";
import { EmailService } from "~/modules/reports/email/email.service";
import { PdfService } from "~/modules/reports/pdf/pdf.service";
import { WorkspaceService } from "~/modules/workspace/workspace.service";
import { PrismaService } from "~/prisma/prisma.service";

const REPORTS_CACHE_TTL_SECONDS = 60;
const REPORT_OUTPUT_DIR = "/tmp/pulse-reports";

interface GenerateReportJobPayload {
  reportId: string;
  userId: string;
  workspaceId: string;
}

interface SendReportEmailJobPayload {
  reportId: string;
  userId: string;
  workspaceId: string;
  deliveryId?: string;
}

interface ReportPeriodRange {
  start: Date;
  end: Date;
}

export interface ListReportsFilters {
  type?: ReportType;
  status?: ReportStatus;
}

export interface ReportDeliveryItem {
  id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipient: string | null;
  attempts: number;
  sentAt: Date | null;
  errorMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportScheduleItem {
  id: string;
  type: ReportType;
  enabled: boolean;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourUtc: number;
  minuteUtc: number;
  lastRunAt: Date | null;
  updatedAt: Date;
}

export interface ReportListItem {
  id: string;
  userId: string;
  workspaceId: string;
  type: ReportType;
  status: ReportStatus;
  periodStart: Date;
  periodEnd: Date;
  pdfUrl: string | null;
  aiDigest: string | null;
  errorMsg: string | null;
  deliveries: ReportDeliveryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportDownloadPayload {
  fileName: string;
  content: Buffer;
}

export interface UpdateScheduleInput {
  enabled?: boolean;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourUtc?: number;
  minuteUtc?: number;
}

@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private schedulerTimer?: NodeJS.Timeout;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService,
    private readonly analyticsService: AnalyticsService,
    private readonly digestService: DigestService,
    private readonly cacheService: CacheService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly workspaceService: WorkspaceService,
    private readonly auditService: AuditService
  ) {}

  onModuleInit(): void {
    this.queueService.register<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, async (payload) => {
      await this.processReportGeneration(payload);
    });

    this.queueService.register<SendReportEmailJobPayload>(JOBS.SEND_REPORT, async (payload) => {
      await this.processReportEmail(payload);
    });

    this.schedulerTimer = setInterval(() => {
      void this.processSchedules();
    }, 60_000);
  }

  onModuleDestroy(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = undefined;
    }
  }

  async listReports(userId: string, filters: ListReportsFilters = {}): Promise<ReportListItem[]> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    const cacheKey = this.getListCacheKey(workspace.workspaceId, filters);

    return this.cacheService.wrap(cacheKey, REPORTS_CACHE_TTL_SECONDS, async () => {
      const where: Prisma.ReportWhereInput = {
        workspaceId: workspace.workspaceId
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
        take: 60,
        include: {
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      });

      return reports.map((report) => this.toListItem(report));
    });
  }

  async createReport(userId: string, type: ReportType = ReportType.WEEKLY): Promise<ReportListItem> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    return this.createReportForWorkspace(workspace.workspaceId, userId, type, "REPORT_GENERATE_REQUESTED");
  }

  async retryReport(reportId: string, userId: string): Promise<ReportListItem> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    const report = await this.getOwnedReport(reportId, workspace.workspaceId);
    if (report.status === ReportStatus.PENDING || report.status === ReportStatus.PROCESSING) {
      throw new BadRequestException("Report is already in progress.");
    }

    const reset = await this.prismaService.report.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.PENDING,
        errorMsg: null,
        pdfUrl: null
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    await this.auditService.logUserAction(workspace.workspaceId, userId, "REPORT_RETRY_REQUESTED", {
      reportId
    });

    await this.invalidateListCache(workspace.workspaceId);
    await this.queueService.enqueue<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, {
      reportId: reset.id,
      userId: report.userId,
      workspaceId: report.workspaceId
    });

    return this.toListItem(reset);
  }

  async retryDelivery(reportId: string, deliveryId: string, userId: string): Promise<ReportListItem> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    const report = await this.getOwnedReport(reportId, workspace.workspaceId);
    const delivery = await this.prismaService.reportDelivery.findFirst({
      where: {
        id: deliveryId,
        reportId: report.id,
        workspaceId: workspace.workspaceId
      }
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found.");
    }

    await this.queueService.enqueue<SendReportEmailJobPayload>(JOBS.SEND_REPORT, {
      reportId: report.id,
      userId: report.userId,
      workspaceId: workspace.workspaceId,
      deliveryId: delivery.id
    });

    await this.auditService.logUserAction(workspace.workspaceId, userId, "REPORT_DELIVERY_RETRY_REQUESTED", {
      reportId,
      deliveryId
    });

    await this.invalidateListCache(workspace.workspaceId);

    const refreshed = await this.prismaService.report.findUnique({
      where: { id: report.id },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    if (!refreshed) {
      throw new NotFoundException("Report not found after delivery retry.");
    }

    return this.toListItem(refreshed);
  }

  async getDownload(reportId: string, userId: string): Promise<ReportDownloadPayload> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    const report = await this.getOwnedReport(reportId, workspace.workspaceId);
    if (report.status !== ReportStatus.DONE || !report.pdfUrl) {
      throw new BadRequestException("Report PDF is not available yet.");
    }

    let content: Buffer;
    try {
      content = await readFile(report.pdfUrl);
    } catch (error) {
      if (!this.isMissingFileError(error)) {
        throw error;
      }

      const regeneratedContent = await this.pdfService.render({
        title: "Pulse Analytics Report",
        periodLabel: `${this.toIsoDate(report.periodStart)} to ${this.toIsoDate(report.periodEnd)}`,
        generatedAt: new Date().toISOString(),
        kpis: [
          { label: "Report type", value: report.type },
          { label: "Workspace", value: report.workspaceId.slice(0, 8) },
          { label: "Report ID", value: report.id.slice(0, 8) },
          { label: "Generated", value: this.toIsoDate(report.updatedAt) }
        ],
        digest: report.aiDigest?.trim() || "Report regenerated automatically after storage recovery."
      });

      const refreshedPdfUrl = await this.persistPdf(report.id, regeneratedContent);
      await this.prismaService.report.update({
        where: { id: report.id },
        data: {
          pdfUrl: refreshedPdfUrl,
          status: ReportStatus.DONE,
          errorMsg: null
        }
      });

      await this.auditService.logSystemAction(report.workspaceId, "REPORT_PDF_REGENERATED", {
        reportId: report.id
      });

      content = regeneratedContent;
    }

    const fileName = `pulse-${report.type.toLowerCase()}-${this.toIsoDate(report.periodEnd)}.pdf`;
    return { fileName, content };
  }

  async listSchedules(userId: string): Promise<ReportScheduleItem[]> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    await this.ensureDefaultSchedules(workspace.workspaceId);

    const schedules = await this.prismaService.reportSchedule.findMany({
      where: {
        workspaceId: workspace.workspaceId
      },
      orderBy: [{ type: "asc" }]
    });

    return schedules.map((schedule) => this.toScheduleItem(schedule));
  }

  async updateSchedule(userId: string, type: ReportType, input: UpdateScheduleInput): Promise<ReportScheduleItem> {
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId);
    await this.ensureDefaultSchedules(workspace.workspaceId);

    const existing = await this.prismaService.reportSchedule.findUnique({
      where: {
        workspaceId_type: {
          workspaceId: workspace.workspaceId,
          type
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("Report schedule not found.");
    }

    const next = await this.prismaService.reportSchedule.update({
      where: {
        workspaceId_type: {
          workspaceId: workspace.workspaceId,
          type
        }
      },
      data: {
        enabled: input.enabled ?? existing.enabled,
        dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
        dayOfMonth: input.dayOfMonth ?? existing.dayOfMonth,
        hourUtc: input.hourUtc ?? existing.hourUtc,
        minuteUtc: input.minuteUtc ?? existing.minuteUtc
      }
    });

    await this.auditService.logUserAction(workspace.workspaceId, userId, "REPORT_SCHEDULE_UPDATED", {
      type,
      enabled: next.enabled,
      dayOfWeek: next.dayOfWeek,
      dayOfMonth: next.dayOfMonth,
      hourUtc: next.hourUtc,
      minuteUtc: next.minuteUtc
    });

    return this.toScheduleItem(next);
  }

  private async createReportForWorkspace(
    workspaceId: string,
    userId: string,
    type: ReportType,
    auditAction: string
  ): Promise<ReportListItem> {
    const range = this.computeRange(type);

    const report = await this.prismaService.report.create({
      data: {
        userId,
        workspaceId,
        type,
        status: ReportStatus.PENDING,
        periodStart: range.start,
        periodEnd: range.end
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    await this.auditService.logUserAction(workspaceId, userId, auditAction, {
      reportId: report.id,
      type
    });

    await this.invalidateListCache(workspaceId);
    await this.queueService.enqueue<GenerateReportJobPayload>(JOBS.GENERATE_REPORT, {
      reportId: report.id,
      userId,
      workspaceId
    });

    return this.toListItem(report);
  }

  private async processSchedules(): Promise<void> {
    const now = new Date();
    const schedules = await this.prismaService.reportSchedule.findMany({
      where: {
        enabled: true
      },
      include: {
        workspace: {
          select: {
            ownerId: true
          }
        }
      }
    });

    for (const schedule of schedules) {
      if (!this.isScheduleDue(schedule, now)) {
        continue;
      }

      const lastRunAt = schedule.lastRunAt;
      if (lastRunAt && this.isSameMinute(lastRunAt, now)) {
        continue;
      }

      await this.prismaService.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now
        }
      });

      await this.createReportForWorkspace(
        schedule.workspaceId,
        schedule.workspace.ownerId,
        schedule.type,
        "REPORT_GENERATE_SCHEDULED"
      );
    }
  }

  private isScheduleDue(schedule: ReportSchedule, now: Date): boolean {
    if (!schedule.enabled) {
      return false;
    }

    if (now.getUTCHours() !== schedule.hourUtc || now.getUTCMinutes() !== schedule.minuteUtc) {
      return false;
    }

    if (schedule.type === ReportType.WEEKLY) {
      const target = schedule.dayOfWeek ?? 1;
      return now.getUTCDay() === target;
    }

    const targetDay = schedule.dayOfMonth ?? 1;
    return now.getUTCDate() === targetDay;
  }

  private async processReportGeneration(payload: GenerateReportJobPayload): Promise<void> {
    const report = await this.prismaService.report.findUnique({
      where: { id: payload.reportId }
    });
    if (!report || report.userId !== payload.userId || report.workspaceId !== payload.workspaceId) {
      return;
    }

    await this.prismaService.report.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.PROCESSING,
        errorMsg: null
      }
    });

    try {
      const period = report.type === ReportType.WEEKLY ? Period.SEVEN_DAYS : Period.THIRTY_DAYS;
      const [overview, youtube, ga4, lastDigest] = await Promise.all([
        this.analyticsService.getOverview(period, report.userId),
        this.analyticsService.getYoutubeStats(period, report.userId),
        this.analyticsService.getGa4Stats(period, report.userId).catch(() => null),
        this.prismaService.aiDigest.findFirst({
          where: { workspaceId: report.workspaceId },
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
      const highlights = this.buildReportHighlights({
        youtubeViews: overview.youtubeViews,
        youtubeDelta: overview.youtubeViewsDelta,
        sessions: overview.webSessions,
        sessionsDelta: overview.webSessionsDelta,
        pulseScore: overview.pulseScore,
        pulseScoreDelta: overview.pulseScoreDelta,
        averageRetention: youtube.averageRetention,
        retentionDelta: youtube.averageRetentionDelta,
        topVideoTitle: youtube.topVideos[0]?.title,
        topVideoViews: youtube.topVideos[0]?.views
      });
      const recommendations = this.buildReportRecommendations({
        youtubeDelta: overview.youtubeViewsDelta,
        sessionsDelta: overview.webSessionsDelta,
        averageRetention: youtube.averageRetention,
        bounceRate: ga4?.bounceRate ?? null,
        newUsersDelta: ga4?.newUsersDelta ?? null
      });
      const nextActions = this.buildReportNextActions(report.type);

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
        digest,
        highlights,
        recommendations,
        nextActions
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

      await this.auditService.logSystemAction(report.workspaceId, "REPORT_GENERATED", {
        reportId: report.id,
        type: report.type
      });

      await this.invalidateListCache(report.workspaceId);
      await this.queueService.enqueue<SendReportEmailJobPayload>(JOBS.SEND_REPORT, {
        reportId: report.id,
        userId: report.userId,
        workspaceId: report.workspaceId
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

      await this.auditService.logSystemAction(report.workspaceId, "REPORT_GENERATION_FAILED", {
        reportId: report.id,
        message
      });

      await this.invalidateListCache(report.workspaceId);
    }
  }

  private async processReportEmail(payload: SendReportEmailJobPayload): Promise<void> {
    const report = await this.prismaService.report.findUnique({
      where: { id: payload.reportId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!report || report.userId !== payload.userId || report.workspaceId !== payload.workspaceId || report.status !== ReportStatus.DONE) {
      return;
    }

    const delivery = payload.deliveryId
      ? await this.prismaService.reportDelivery.findFirst({
          where: {
            id: payload.deliveryId,
            reportId: report.id,
            workspaceId: report.workspaceId
          }
        })
      : await this.prismaService.reportDelivery.create({
          data: {
            workspaceId: report.workspaceId,
            reportId: report.id,
            channel: DeliveryChannel.EMAIL,
            status: DeliveryStatus.PENDING,
            recipient: report.user.email
          }
        });

    if (!delivery) {
      return;
    }

    try {
      await this.emailService.sendReportReadyEmail({
        userId: report.userId,
        recipientEmail: report.user.email,
        reportId: report.id,
        reportType: report.type
      });

      await this.prismaService.reportDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.SENT,
          attempts: {
            increment: 1
          },
          sentAt: new Date(),
          errorMsg: null
        }
      });

      await this.auditService.logSystemAction(report.workspaceId, "REPORT_DELIVERED", {
        reportId: report.id,
        deliveryId: delivery.id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report delivery failed.";
      await this.prismaService.reportDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          attempts: {
            increment: 1
          },
          errorMsg: message
        }
      });

      await this.auditService.logSystemAction(report.workspaceId, "REPORT_DELIVERY_FAILED", {
        reportId: report.id,
        deliveryId: delivery.id,
        message
      });
    }

    await this.invalidateListCache(report.workspaceId);
  }

  private async getOwnedReport(reportId: string, workspaceId: string): Promise<Report> {
    const report = await this.prismaService.report.findFirst({
      where: {
        id: reportId,
        workspaceId
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found.");
    }

    return report;
  }

  private toListItem(report: Report & { deliveries?: ReportDelivery[] }): ReportListItem {
    return {
      id: report.id,
      userId: report.userId,
      workspaceId: report.workspaceId,
      type: report.type,
      status: report.status,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      pdfUrl: report.pdfUrl,
      aiDigest: report.aiDigest,
      errorMsg: report.errorMsg,
      deliveries: (report.deliveries ?? []).map((delivery) => this.toDeliveryItem(delivery)),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }

  private toDeliveryItem(delivery: ReportDelivery): ReportDeliveryItem {
    return {
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      recipient: delivery.recipient,
      attempts: delivery.attempts,
      sentAt: delivery.sentAt,
      errorMsg: delivery.errorMsg,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    };
  }

  private toScheduleItem(schedule: ReportSchedule): ReportScheduleItem {
    return {
      id: schedule.id,
      type: schedule.type,
      enabled: schedule.enabled,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      hourUtc: schedule.hourUtc,
      minuteUtc: schedule.minuteUtc,
      lastRunAt: schedule.lastRunAt,
      updatedAt: schedule.updatedAt
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

  private isSameMinute(left: Date, right: Date): boolean {
    return (
      left.getUTCFullYear() === right.getUTCFullYear() &&
      left.getUTCMonth() === right.getUTCMonth() &&
      left.getUTCDate() === right.getUTCDate() &&
      left.getUTCHours() === right.getUTCHours() &&
      left.getUTCMinutes() === right.getUTCMinutes()
    );
  }

  private async persistPdf(reportId: string, pdfContent: Buffer): Promise<string> {
    await mkdir(REPORT_OUTPUT_DIR, { recursive: true });
    const filePath = join(REPORT_OUTPUT_DIR, `${reportId}.pdf`);
    await writeFile(filePath, pdfContent);
    return filePath;
  }

  private async invalidateListCache(workspaceId: string): Promise<void> {
    await this.cacheService.del(`pulse:reports:${workspaceId}:list:*`);
  }

  private getListCacheKey(workspaceId: string, filters: ListReportsFilters): string {
    const type = filters.type ?? "ALL";
    const status = filters.status ?? "ALL";
    return `pulse:reports:${workspaceId}:list:${type}:${status}`;
  }

  private composeDigest(
    type: ReportType,
    youtubeViews: number,
    webSessions: number,
    pulseScore: number,
    youtubeDelta: number,
    sessionsDelta: number
  ): string {
    return this.digestService.generateHeuristicDigest({
      reportType: type,
      youtubeViews,
      webSessions,
      pulseScore,
      youtubeDelta,
      sessionsDelta
    });
  }

  private buildReportHighlights(input: {
    youtubeViews: number;
    youtubeDelta: number;
    sessions: number;
    sessionsDelta: number;
    pulseScore: number;
    pulseScoreDelta: number;
    averageRetention: number;
    retentionDelta: number;
    topVideoTitle?: string;
    topVideoViews?: number;
  }): string[] {
    const highlights: string[] = [
      `Pulse Score at ${input.pulseScore} (${this.formatSignedDelta(input.pulseScoreDelta)} vs previous cycle).`,
      `YouTube reached ${input.youtubeViews} views (${this.formatSignedDelta(input.youtubeDelta)}).`,
      `Web acquisition delivered ${input.sessions} sessions (${this.formatSignedDelta(input.sessionsDelta)}).`,
      `Average retention is ${input.averageRetention.toFixed(1)}% (${this.formatSignedDelta(input.retentionDelta)}).`
    ];

    if (input.topVideoTitle && typeof input.topVideoViews === "number") {
      highlights.unshift(`Top video: "${input.topVideoTitle}" with ${input.topVideoViews} views.`);
    }

    return highlights.slice(0, 4);
  }

  private buildReportRecommendations(input: {
    youtubeDelta: number;
    sessionsDelta: number;
    averageRetention: number;
    bounceRate: number | null;
    newUsersDelta: number | null;
  }): string[] {
    const recommendations: string[] = [];

    if (input.youtubeDelta < 0) {
      recommendations.push("Rework publication cadence: test shorter gaps between top-performing formats.");
    } else {
      recommendations.push("Scale high-performing video topics and keep publication consistency this week.");
    }

    if (input.sessionsDelta < 0) {
      recommendations.push("Strengthen CTA path from videos to landing pages with explicit next-step prompts.");
    } else {
      recommendations.push("Duplicate the strongest YouTube-to-site journey in upcoming campaign assets.");
    }

    if (input.averageRetention < 30) {
      recommendations.push("Improve first 20 seconds of videos (faster hook, clearer promise, tighter pacing).");
    } else {
      recommendations.push("Retention is healthy: prioritize conversion-oriented sections in second half of videos.");
    }

    if (typeof input.bounceRate === "number" && input.bounceRate > 60) {
      recommendations.push("Reduce bounce rate by aligning landing-page message with each traffic source intent.");
    }

    if (typeof input.newUsersDelta === "number" && input.newUsersDelta < 0) {
      recommendations.push("Launch one discovery-focused content experiment to restore new-user momentum.");
    }

    return recommendations.slice(0, 5);
  }

  private buildReportNextActions(type: ReportType): string[] {
    const cadence = type === ReportType.WEEKLY ? "next 7 days" : "next 30 days";
    return [
      `Finalize team priorities for the ${cadence}.`,
      "Assign one owner per recommendation and define measurable targets.",
      "Track execution progress mid-cycle and remove blockers quickly.",
      "Review impact in next report and iterate immediately."
    ];
  }

  private formatSignedDelta(value: number): string {
    const rounded = Number(value.toFixed(1));
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}`;
  }

  private isMissingFileError(error: unknown): boolean {
    const nodeError = error as NodeJS.ErrnoException | undefined;
    return Boolean(nodeError?.code === "ENOENT");
  }

  private async ensureDefaultSchedules(workspaceId: string): Promise<void> {
    await this.prismaService.reportSchedule.createMany({
      data: [
        {
          workspaceId,
          type: ReportType.WEEKLY,
          enabled: true,
          dayOfWeek: 1,
          hourUtc: 9,
          minuteUtc: 0
        },
        {
          workspaceId,
          type: ReportType.MONTHLY,
          enabled: true,
          dayOfMonth: 1,
          hourUtc: 9,
          minuteUtc: 0
        }
      ],
      skipDuplicates: true
    });
  }
}

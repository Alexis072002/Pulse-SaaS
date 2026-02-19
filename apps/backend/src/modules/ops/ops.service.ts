import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ReportStatus } from "@prisma/client";
import { LoggingInterceptor } from "~/common/interceptors/logging.interceptor";
import { QueueService } from "~/modules/queue/queue.service";
import { PrismaService } from "~/prisma/prisma.service";

@Injectable()
export class OpsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService
  ) {}

  assertAccess(presentedKey: string | undefined): void {
    const requiredKey = this.configService.get<string>("OPS_PANEL_KEY")?.trim();
    if (!requiredKey) {
      return;
    }

    if (!presentedKey || presentedKey !== requiredKey) {
      throw new ForbiddenException("Invalid ops key.");
    }
  }

  async getHealth(): Promise<{
    status: "ok" | "degraded";
    timestamp: string;
    uptimeSeconds: number;
    environment: string;
    nodeVersion: string;
    database: { ok: boolean; latencyMs: number };
    queue: { total: number; waiting: number; active: number; completed: number; failed: number };
    memory: {
      rssBytes: number;
      heapTotalBytes: number;
      heapUsedBytes: number;
      externalBytes: number;
    };
  }> {
    const startedAt = Date.now();
    let databaseOk = true;

    try {
      await this.prismaService.user.count();
    } catch {
      databaseOk = false;
    }

    const memory = process.memoryUsage();
    const queueStats = this.queueService.getStats();

    return {
      status: databaseOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: this.configService.get<string>("NODE_ENV") ?? "development",
      nodeVersion: process.version,
      database: {
        ok: databaseOk,
        latencyMs: Date.now() - startedAt
      },
      queue: queueStats,
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external
      }
    };
  }

  async getMetrics(): Promise<{
    timestamp: string;
    counts: {
      users: number;
      reports: number;
      snapshots: number;
      digests: number;
    };
    reportsByStatus: Record<ReportStatus, number>;
    requests: ReturnType<typeof LoggingInterceptor.getSummary>;
    queue: ReturnType<QueueService["getStats"]>;
  }> {
    const [users, reports, snapshots, digests, groupedReports] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.report.count(),
      this.prismaService.analyticsSnapshot.count(),
      this.prismaService.aiDigest.count(),
      this.prismaService.report.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      })
    ]);

    const reportsByStatus: Record<ReportStatus, number> = {
      PENDING: 0,
      DONE: 0,
      FAILED: 0
    };

    for (const row of groupedReports) {
      reportsByStatus[row.status] = row._count._all;
    }

    return {
      timestamp: new Date().toISOString(),
      counts: {
        users,
        reports,
        snapshots,
        digests
      },
      reportsByStatus,
      requests: LoggingInterceptor.getSummary(),
      queue: this.queueService.getStats()
    };
  }

  getLogs(limit = 120): ReturnType<typeof LoggingInterceptor.getRecentLogs> {
    return LoggingInterceptor.getRecentLogs(limit);
  }
}

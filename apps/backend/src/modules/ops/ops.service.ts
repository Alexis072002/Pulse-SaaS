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
      workspaces: number;
      users: number;
      reports: number;
      snapshots: number;
      digests: number;
      auditLogs: number;
    };
    reportsByStatus: Record<ReportStatus, number>;
    requests: ReturnType<typeof LoggingInterceptor.getSummary>;
    queue: ReturnType<QueueService["getStats"]>;
  }> {
    const [workspaces, users, reports, snapshots, digests, auditLogs, groupedReports] = await Promise.all([
      this.prismaService.workspace.count(),
      this.prismaService.user.count(),
      this.prismaService.report.count(),
      this.prismaService.analyticsSnapshot.count(),
      this.prismaService.aiDigest.count(),
      this.prismaService.auditLog.count(),
      this.prismaService.report.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      })
    ]);

    const reportsByStatus: Record<ReportStatus, number> = {
      PENDING: 0,
      PROCESSING: 0,
      DONE: 0,
      FAILED: 0
    };

    for (const row of groupedReports) {
      reportsByStatus[row.status] = row._count._all;
    }

    return {
      timestamp: new Date().toISOString(),
      counts: {
        workspaces,
        users,
        reports,
        snapshots,
        digests,
        auditLogs
      },
      reportsByStatus,
      requests: LoggingInterceptor.getSummary(),
      queue: this.queueService.getStats()
    };
  }

  getLogs(limit = 120): ReturnType<typeof LoggingInterceptor.getRecentLogs> {
    return LoggingInterceptor.getRecentLogs(limit);
  }

  async getAuditLogs(limit = 120): Promise<Array<{
    id: string;
    createdAt: Date;
    action: string;
    actorType: string;
    actorUserId: string | null;
    workspaceId: string;
    metadata: unknown;
  }>> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const rows = await this.prismaService.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      actorType: row.actorType,
      actorUserId: row.actorUserId,
      workspaceId: row.workspaceId,
      metadata: row.metadata
    }));
  }
}

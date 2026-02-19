import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Observable, tap } from "rxjs";

interface RequestLogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ok: boolean;
  ip: string;
}

interface RequestLogSummary {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private static readonly maxEntries = 500;
  private static readonly logEntries: RequestLogEntry[] = [];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const startedAt = Date.now();
    const requestId = this.resolveRequestId(request.headers);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest({
            request,
            response,
            startedAt,
            requestId,
            failed: false
          });
        },
        error: (error: unknown) => {
          const errorStatus = this.extractErrorStatus(error);
          this.logRequest({
            request,
            response: { statusCode: errorStatus },
            startedAt,
            requestId,
            failed: true
          });
        }
      })
    );
  }

  static getRecentLogs(limit = 100): RequestLogEntry[] {
    const safeLimit = Math.max(1, Math.min(limit, this.maxEntries));
    return [...this.logEntries].slice(-safeLimit).reverse();
  }

  static getSummary(): RequestLogSummary {
    if (this.logEntries.length === 0) {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        averageDurationMs: 0,
        p95DurationMs: 0
      };
    }

    const durations = this.logEntries.map((entry) => entry.durationMs).sort((a, b) => a - b);
    const successCount = this.logEntries.filter((entry) => entry.ok).length;
    const errorCount = this.logEntries.length - successCount;
    const totalDuration = this.logEntries.reduce((sum, entry) => sum + entry.durationMs, 0);
    const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));

    return {
      totalRequests: this.logEntries.length,
      successCount,
      errorCount,
      successRate: Number(((successCount / this.logEntries.length) * 100).toFixed(1)),
      averageDurationMs: Number((totalDuration / this.logEntries.length).toFixed(1)),
      p95DurationMs: Number((durations[p95Index] ?? 0).toFixed(1))
    };
  }

  private logRequest(input: {
    request: { method: string; url: string; ip?: string };
    response: { statusCode?: number };
    startedAt: number;
    requestId: string;
    failed: boolean;
  }): void {
    const durationMs = Date.now() - input.startedAt;
    const statusCode = input.response.statusCode ?? (input.failed ? 500 : 200);
    const entry: RequestLogEntry = {
      requestId: input.requestId,
      timestamp: new Date().toISOString(),
      method: input.request.method,
      url: input.request.url,
      statusCode,
      durationMs,
      ok: !input.failed && statusCode < 400,
      ip: input.request.ip ?? "unknown"
    };

    LoggingInterceptor.logEntries.push(entry);
    if (LoggingInterceptor.logEntries.length > LoggingInterceptor.maxEntries) {
      LoggingInterceptor.logEntries.shift();
    }

    const serialized = JSON.stringify(entry);
    if (entry.ok) {
      this.logger.log(serialized);
    } else {
      this.logger.error(serialized);
    }
  }

  private resolveRequestId(headers: Record<string, string | string[] | undefined> | undefined): string {
    const raw = headers?.["x-request-id"];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw;
    }
    if (Array.isArray(raw) && raw[0] && raw[0].trim().length > 0) {
      return raw[0];
    }
    return randomUUID();
  }

  private extractErrorStatus(error: unknown): number {
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number") {
        return status;
      }
    }
    return 500;
  }
}

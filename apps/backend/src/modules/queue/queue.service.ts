import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

type QueueJobStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "FAILED";
type QueueHandler<TPayload> = (payload: TPayload) => Promise<void>;

interface QueueJobRecord {
  id: string;
  name: string;
  status: QueueJobStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly handlers = new Map<string, QueueHandler<unknown>>();
  private readonly jobs = new Map<string, QueueJobRecord>();

  register<TPayload>(jobName: string, handler: QueueHandler<TPayload>): void {
    this.handlers.set(jobName, handler as QueueHandler<unknown>);
  }

  async enqueue<TPayload>(jobName: string, payload: TPayload): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    const now = new Date();

    this.jobs.set(jobId, {
      id: jobId,
      name: jobName,
      status: "WAITING",
      createdAt: now,
      updatedAt: now
    });

    queueMicrotask(() => {
      void this.process(jobId, jobName, payload);
    });

    return { jobId };
  }

  getStatus(jobId: string): QueueJobRecord | null {
    return this.jobs.get(jobId) ?? null;
  }

  private async process<TPayload>(jobId: string, jobName: string, payload: TPayload): Promise<void> {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      this.updateStatus(jobId, "FAILED", `No handler registered for job '${jobName}'.`);
      this.logger.error(`Queue handler missing for job '${jobName}'.`);
      return;
    }

    this.updateStatus(jobId, "ACTIVE");
    try {
      await handler(payload as unknown);
      this.updateStatus(jobId, "COMPLETED");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown queue error";
      this.updateStatus(jobId, "FAILED", message);
      this.logger.error(`Queue job '${jobName}' failed: ${message}`);
    }
  }

  private updateStatus(jobId: string, status: QueueJobStatus, errorMessage?: string): void {
    const existing = this.jobs.get(jobId);
    if (!existing) {
      return;
    }

    this.jobs.set(jobId, {
      ...existing,
      status,
      errorMessage,
      updatedAt: new Date()
    });
  }
}

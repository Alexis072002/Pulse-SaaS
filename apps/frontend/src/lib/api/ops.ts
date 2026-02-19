import { cookies } from "next/headers";

interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface OpsHealthData {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  database: {
    ok: boolean;
    latencyMs: number;
  };
  queue: {
    total: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  memory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
  };
}

export interface OpsMetricsData {
  timestamp: string;
  counts: {
    users: number;
    reports: number;
    snapshots: number;
    digests: number;
  };
  reportsByStatus: {
    PENDING: number;
    DONE: number;
    FAILED: number;
  };
  requests: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    averageDurationMs: number;
    p95DurationMs: number;
  };
  queue: {
    total: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface OpsLogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ok: boolean;
  ip: string;
}

interface FetchOpsOptions {
  key?: string;
}

async function fetchOps<TData>(path: string, options: FetchOpsOptions = {}): Promise<TData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const headers = new Headers({
    Authorization: `Bearer ${jwt}`
  });
  if (options.key) {
    headers.set("x-ops-key", options.key);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    if (response.status === 403) {
      throw new Error("OPS_FORBIDDEN");
    }
    throw new Error(`OPS_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<TData>;
  if (!payload.success) {
    throw new Error("INVALID_OPS_PAYLOAD");
  }

  return payload.data;
}

export async function getOpsHealth(options: FetchOpsOptions = {}): Promise<OpsHealthData> {
  return fetchOps<OpsHealthData>("/ops/health", options);
}

export async function getOpsMetrics(options: FetchOpsOptions = {}): Promise<OpsMetricsData> {
  return fetchOps<OpsMetricsData>("/ops/metrics", options);
}

export async function getOpsLogs(limit = 120, options: FetchOpsOptions = {}): Promise<OpsLogEntry[]> {
  const params = new URLSearchParams({
    limit: String(limit)
  });
  return fetchOps<OpsLogEntry[]>(`/ops/logs?${params.toString()}`, options);
}

export function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let current = Math.max(0, value);
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(1)} ${units[unitIndex]}`;
}

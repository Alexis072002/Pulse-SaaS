import { cookies } from "next/headers";

export type ReportType = "WEEKLY" | "MONTHLY";
export type ReportStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type DeliveryStatus = "PENDING" | "SENT" | "FAILED";
export type DeliveryChannel = "EMAIL" | "IN_APP";

export interface ReportDeliveryItem {
  id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipient: string | null;
  attempts: number;
  sentAt: string | null;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportItem {
  id: string;
  userId: string;
  workspaceId: string;
  type: ReportType;
  status: ReportStatus;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
  aiDigest: string | null;
  errorMsg: string | null;
  deliveries: ReportDeliveryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportSchedule {
  id: string;
  type: ReportType;
  enabled: boolean;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourUtc: number;
  minuteUtc: number;
  lastRunAt: string | null;
  updatedAt: string;
}

interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta: {
    timestamp: string;
    version: string;
  };
}

interface ReportsFilters {
  type?: ReportType;
  status?: ReportStatus;
}

export function parseReportType(raw: string | undefined): ReportType | undefined {
  if (raw === "WEEKLY" || raw === "MONTHLY") {
    return raw;
  }
  return undefined;
}

export function parseReportStatus(raw: string | undefined): ReportStatus | undefined {
  if (raw === "PENDING" || raw === "PROCESSING" || raw === "DONE" || raw === "FAILED") {
    return raw;
  }
  return undefined;
}

export async function getReports(filters: ReportsFilters = {}): Promise<ReportItem[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const params = new URLSearchParams();
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }

  const queryString = params.toString();
  const response = await fetch(
    `${apiBaseUrl}/reports${queryString ? `?${queryString}` : ""}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    throw new Error(`REPORTS_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<ReportItem[]>;
  if (!payload.success) {
    throw new Error("INVALID_REPORTS_PAYLOAD");
  }

  return payload.data;
}

export async function getReportSchedules(): Promise<ReportSchedule[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${apiBaseUrl}/reports/schedules`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    throw new Error(`REPORT_SCHEDULES_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<ReportSchedule[]>;
  if (!payload.success) {
    throw new Error("INVALID_REPORT_SCHEDULES_PAYLOAD");
  }

  return payload.data;
}

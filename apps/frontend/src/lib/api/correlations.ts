import { cookies } from "next/headers";
import { formatDate } from "@/lib/utils/formatDate";

export type Period = "7d" | "30d" | "90d";

export interface CorrelationPoint {
  date: string;
  youtubeViews: number;
  webSessions: number;
  youtubeNormalized: number;
  webSessionsNormalized: number;
}

export interface CorrelationEvent {
  date: string;
  label: string;
  type: string;
}

export interface CorrelationData {
  period: Period;
  score: number;
  lagDays: number;
  laggedScore: number;
  insight: string;
  points: CorrelationPoint[];
  events: CorrelationEvent[];
  lastUpdatedAt: string;
}

interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta: {
    timestamp: string;
    version: string;
  };
}

export function parsePeriod(period: string | undefined): Period {
  if (period === "7d" || period === "90d") {
    return period;
  }
  return "30d";
}

export async function getCorrelations(period: Period): Promise<CorrelationData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${apiBaseUrl}/analytics/correlations?period=${period}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    if (response.status === 400) {
      throw new Error("GA4_NOT_CONFIGURED");
    }
    throw new Error(`CORRELATIONS_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<CorrelationData>;
  if (!payload.success) {
    throw new Error("INVALID_CORRELATIONS_PAYLOAD");
  }

  return payload.data;
}

export function toChartData(data: CorrelationData): Array<{
  date: string;
  dateLabel: string;
  youtubeViews: number;
  webSessions: number;
}> {
  return data.points.map((point) => ({
    date: point.date,
    dateLabel: formatDate(point.date),
    youtubeViews: point.youtubeViews,
    webSessions: point.webSessions
  }));
}

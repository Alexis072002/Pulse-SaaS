import { cookies } from "next/headers";
import { formatDate } from "@/lib/utils/formatDate";

export type Period = "7d" | "30d" | "90d";

interface TimeSeriesPoint {
  date: string;
  youtubeViews: number;
  webSessions: number;
}

export interface OverviewData {
  youtubeViews: number;
  youtubeViewsDelta: number;
  subscribersGained: number;
  webSessions: number;
  webSessionsDelta: number;
  pulseScore: number;
  pulseScoreDelta: number;
  timeSeries: TimeSeriesPoint[];
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

export async function getOverviewData(period: Period): Promise<OverviewData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${apiBaseUrl}/analytics/overview?period=${period}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    throw new Error(`OVERVIEW_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<OverviewData>;
  if (!payload.success) {
    throw new Error("INVALID_OVERVIEW_PAYLOAD");
  }

  return payload.data;
}

export function toChartData(data: OverviewData): Array<{ date: string; youtube: number; ga: number }> {
  return data.timeSeries.map((point) => ({
    date: formatDate(point.date),
    youtube: point.youtubeViews,
    ga: point.webSessions
  }));
}

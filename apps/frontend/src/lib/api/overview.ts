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

const DEFAULT_OVERVIEW: OverviewData = {
  youtubeViews: 28_400,
  youtubeViewsDelta: 18.4,
  subscribersGained: 1120,
  webSessions: 9_120,
  webSessionsDelta: -7.2,
  pulseScore: 847,
  pulseScoreDelta: -2,
  timeSeries: [
    { date: "2026-02-01", youtubeViews: 320, webSessions: 110 },
    { date: "2026-02-02", youtubeViews: 500, webSessions: 170 },
    { date: "2026-02-03", youtubeViews: 430, webSessions: 160 },
    { date: "2026-02-04", youtubeViews: 620, webSessions: 230 },
    { date: "2026-02-05", youtubeViews: 700, webSessions: 280 },
    { date: "2026-02-06", youtubeViews: 540, webSessions: 245 },
    { date: "2026-02-07", youtubeViews: 810, webSessions: 330 }
  ],
  lastUpdatedAt: new Date().toISOString()
};

export async function getOverviewData(period: Period): Promise<OverviewData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${apiBaseUrl}/analytics/overview?period=${period}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return DEFAULT_OVERVIEW;
    }

    const payload = (await response.json()) as ApiSuccess<OverviewData>;
    if (!payload.success) {
      return DEFAULT_OVERVIEW;
    }

    return payload.data;
  } catch {
    return DEFAULT_OVERVIEW;
  }
}

export function toChartData(data: OverviewData): Array<{ date: string; youtube: number; ga: number }> {
  return data.timeSeries.map((point) => ({
    date: formatDate(point.date),
    youtube: point.youtubeViews,
    ga: point.webSessions
  }));
}

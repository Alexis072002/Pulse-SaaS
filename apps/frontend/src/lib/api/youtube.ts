import { cookies } from "next/headers";

export type Period = "7d" | "30d" | "90d";

export interface YoutubeHeatmapCell {
  date: string;
  intensity: number;
  views: number;
}

export interface YoutubeTopVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  views: number;
  retentionRate: number;
  sparkline: number[];
}

export interface YoutubeSubscriberPoint {
  date: string;
  subscribers: number;
  subscribersGained: number;
}

export interface YoutubeStatsData {
  period: Period;
  averageRetention: number;
  averageRetentionDelta: number;
  subscribersTotal: number;
  subscribersGained: number;
  heatmap: YoutubeHeatmapCell[];
  topVideos: YoutubeTopVideo[];
  subscribersSeries: YoutubeSubscriberPoint[];
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

export async function getYoutubeStats(period: Period): Promise<YoutubeStatsData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${apiBaseUrl}/analytics/youtube?period=${period}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHENTICATED");
    }
    throw new Error(`YOUTUBE_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<YoutubeStatsData>;
  if (!payload.success) {
    throw new Error("INVALID_YOUTUBE_PAYLOAD");
  }

  return payload.data;
}

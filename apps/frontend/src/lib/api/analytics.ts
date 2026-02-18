import { cookies } from "next/headers";
import { formatDate } from "@/lib/utils/formatDate";

export type Period = "7d" | "30d" | "90d";

export interface Ga4SessionPoint {
  date: string;
  sessions: number;
}

export interface Ga4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
}

export interface Ga4TopPage {
  pagePath: string;
  sessions: number;
  pageViews: number;
  averageSessionDuration: number;
}

export interface Ga4Country {
  countryCode: string;
  country: string;
  sessions: number;
}

export interface Ga4StatsData {
  period: Period;
  sessions: number;
  sessionsDelta: number;
  newUsers: number;
  newUsersDelta: number;
  bounceRate: number;
  bounceRateDelta: number;
  averageSessionDuration: number;
  averageSessionDurationDelta: number;
  trafficSources: Ga4TrafficSource[];
  topPages: Ga4TopPage[];
  countries: Ga4Country[];
  sessionsSeries: Ga4SessionPoint[];
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

export async function getGa4Stats(period: Period): Promise<Ga4StatsData> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const jwt = cookies().get("pulse_access_token")?.value;
  if (!jwt) {
    throw new Error("UNAUTHENTICATED");
  }

  const response = await fetch(`${apiBaseUrl}/analytics/ga4?period=${period}`, {
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
    throw new Error(`GA4_REQUEST_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as ApiSuccess<Ga4StatsData>;
  if (!payload.success) {
    throw new Error("INVALID_GA4_PAYLOAD");
  }

  return payload.data;
}

export function toSessionsChartData(data: Ga4StatsData): Array<{ date: string; sessions: number }> {
  return data.sessionsSeries.map((point) => ({
    date: formatDate(point.date),
    sessions: point.sessions
  }));
}

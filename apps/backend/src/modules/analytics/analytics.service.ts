import { Injectable } from "@nestjs/common";
import type { GA4Metrics, YouTubeMetrics } from "@pulse/shared";
import { CacheService } from "~/modules/analytics/cache.service";
import { Period } from "~/modules/analytics/dto/get-overview.dto";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";
import { PulseScoreService } from "~/modules/analytics/pulse-score.service";

const CACHE_TTL_SECONDS = 300;
const DAYS_BY_PERIOD: Record<Period, number> = {
  [Period.SEVEN_DAYS]: 7,
  [Period.THIRTY_DAYS]: 30,
  [Period.NINETY_DAYS]: 90
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly pulseScoreService: PulseScoreService
  ) {}

  async getOverview(period: Period, userId = "demo-user"): Promise<OverviewDto> {
    const key = `pulse:analytics:${userId}:overview:${period}`;
    return this.cacheService.wrap(key, CACHE_TTL_SECONDS, async () => this.buildOverview(period));
  }

  private async buildOverview(period: Period): Promise<OverviewDto> {
    const currentSeries = this.generateTimeSeries(DAYS_BY_PERIOD[period], 0);
    const previousSeries = this.generateTimeSeries(DAYS_BY_PERIOD[period], DAYS_BY_PERIOD[period]);

    const youtubeViews = this.sum(currentSeries.map((point) => point.youtubeViews));
    const webSessions = this.sum(currentSeries.map((point) => point.webSessions));
    const subscribersGained = Math.max(0, Math.round(youtubeViews * 0.038));

    const previousYoutubeViews = this.sum(previousSeries.map((point) => point.youtubeViews));
    const previousWebSessions = this.sum(previousSeries.map((point) => point.webSessions));

    const youtubeMetrics: YouTubeMetrics = {
      views: youtubeViews,
      watchTimeMinutes: Math.round(youtubeViews * 2.3),
      subscribers: 58_000,
      subscribersGained,
      subscribersLost: Math.round(subscribersGained * 0.27),
      topVideos: []
    };

    const ga4Metrics: GA4Metrics = {
      sessions: webSessions,
      newUsers: Math.round(webSessions * 0.52),
      activeUsers: Math.round(webSessions * 0.64),
      bounceRate: 0.44,
      averageSessionDuration: 166,
      pageViews: Math.round(webSessions * 1.9),
      topPages: [],
      trafficSources: [],
      countries: []
    };

    const pulseScore = this.pulseScoreService.compute(youtubeMetrics, ga4Metrics);

    const previousPulseScore = this.pulseScoreService.compute(
      {
        ...youtubeMetrics,
        views: previousYoutubeViews,
        subscribersGained: Math.max(0, Math.round(previousYoutubeViews * 0.034)),
        watchTimeMinutes: Math.round(previousYoutubeViews * 2.2)
      },
      {
        ...ga4Metrics,
        sessions: previousWebSessions,
        newUsers: Math.round(previousWebSessions * 0.5),
        activeUsers: Math.round(previousWebSessions * 0.62)
      }
    );

    return {
      youtubeViews,
      youtubeViewsDelta: this.computeDelta(youtubeViews, previousYoutubeViews),
      subscribersGained,
      webSessions,
      webSessionsDelta: this.computeDelta(webSessions, previousWebSessions),
      pulseScore,
      pulseScoreDelta: this.computeDelta(pulseScore, previousPulseScore),
      timeSeries: currentSeries.map((point) => ({
        date: point.date,
        youtubeViews: point.youtubeViews,
        webSessions: point.webSessions
      })),
      lastUpdatedAt: new Date()
    };
  }

  private generateTimeSeries(days: number, offsetDays: number): Array<{ date: string; youtubeViews: number; webSessions: number }> {
    const rows: Array<{ date: string; youtubeViews: number; webSessions: number }> = [];

    for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
      const absoluteIndex = dayIndex + offsetDays;
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - dayIndex);

      const youtubeViews = Math.round(
        820 +
          Math.sin(absoluteIndex / 3) * 180 +
          Math.cos(absoluteIndex / 4) * 60 +
          (absoluteIndex % 9) * 14
      );
      const webSessions = Math.round(
        290 +
          Math.sin((absoluteIndex + 2) / 4) * 85 +
          Math.cos((absoluteIndex + 3) / 5) * 40 +
          (absoluteIndex % 7) * 9
      );

      rows.push({
        date: date.toISOString().slice(0, 10),
        youtubeViews: Math.max(120, youtubeViews),
        webSessions: Math.max(60, webSessions)
      });
    }

    return rows;
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private computeDelta(current: number, previous: number): number {
    if (previous <= 0) {
      return 0;
    }

    const raw = ((current - previous) / previous) * 100;
    return Number(raw.toFixed(1));
  }
}

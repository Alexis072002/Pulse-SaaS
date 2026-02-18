import { BadRequestException, HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GA4Metrics, YouTubeMetrics } from "@pulse/shared";
import { AuthService } from "~/modules/auth/auth.service";
import { CacheService } from "~/modules/analytics/cache.service";
import { CorrelationService } from "~/modules/analytics/correlation/correlation.service";
import {
  type CorrelationDto,
  type CorrelationEventDto,
  type CorrelationPointDto
} from "~/modules/analytics/dto/correlation-response.dto";
import {
  type Ga4CountryDto,
  type Ga4SessionPointDto,
  type Ga4StatsDto,
  type Ga4TopPageDto,
  type Ga4TrafficSourceDto
} from "~/modules/analytics/dto/ga4-stats-response.dto";
import { Period } from "~/modules/analytics/dto/get-overview.dto";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";
import {
  type YoutubeHeatmapCellDto,
  type YoutubeStatsDto,
  type YoutubeSubscriberPointDto,
  type YoutubeTopVideoDto
} from "~/modules/analytics/dto/youtube-stats-response.dto";
import { PulseScoreService } from "~/modules/analytics/pulse-score.service";

const CACHE_TTL_SECONDS = 300;
const DAYS_BY_PERIOD: Record<Period, number> = {
  [Period.SEVEN_DAYS]: 7,
  [Period.THIRTY_DAYS]: 30,
  [Period.NINETY_DAYS]: 90
};

interface YoutubeDailyMetrics {
  date: string;
  views: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedMinutesWatched: number;
}

interface Ga4DailyMetrics {
  date: string;
  sessions: number;
  newUsers: number;
  activeUsers: number;
  bounceRate: number;
  averageSessionDuration: number;
  pageViews: number;
}

interface Ga4TrafficSourceMetrics {
  source: string;
  medium: string;
  sessions: number;
}

interface Ga4TopPageMetrics {
  pagePath: string;
  sessions: number;
  pageViews: number;
  averageSessionDuration: number;
}

interface Ga4CountryMetrics {
  countryCode: string;
  country: string;
  sessions: number;
}

interface YoutubeChannelSummary {
  subscribers: number;
}

interface YoutubeVideoMetric {
  videoId: string;
  views: number;
  averageViewDuration: number;
}

interface YoutubeVideoMeta {
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

interface DateRange {
  start: string;
  end: string;
}

interface CombinedSeriesPoint {
  date: string;
  youtubeViews: number;
  webSessions: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly pulseScoreService: PulseScoreService,
    private readonly correlationService: CorrelationService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  async getOverview(period: Period, userId: string): Promise<OverviewDto> {
    const key = `pulse:analytics:${userId}:overview:${period}`;
    return this.cacheService.wrap(key, CACHE_TTL_SECONDS, async () => this.buildOverview(period, userId));
  }

  async getYoutubeStats(period: Period, userId: string): Promise<YoutubeStatsDto> {
    const key = `pulse:analytics:${userId}:youtube:${period}`;
    return this.cacheService.wrap(key, CACHE_TTL_SECONDS, async () => this.buildYoutubeStats(period, userId));
  }

  async getGa4Stats(period: Period, userId: string): Promise<Ga4StatsDto> {
    const key = `pulse:analytics:${userId}:ga4:${period}`;
    return this.cacheService.wrap(key, CACHE_TTL_SECONDS, async () => this.buildGa4Stats(period, userId));
  }

  async getCorrelations(period: Period, userId: string): Promise<CorrelationDto> {
    const key = `pulse:analytics:${userId}:correlations:${period}`;
    return this.cacheService.wrap(key, CACHE_TTL_SECONDS, async () => this.buildCorrelations(period, userId));
  }

  private async buildOverview(period: Period, userId: string): Promise<OverviewDto> {
    await this.ensureSession(userId);

    const currentRange = this.getCurrentRange(period);
    const previousRange = this.getPreviousRange(period, currentRange);

    const gaPropertyId = await this.getGaPropertyId(userId);

    const [youtubeCurrent, youtubePrevious, gaCurrent, gaPrevious, channelSummary] = await Promise.all([
      this.fetchYoutubeDaily(userId, currentRange),
      this.fetchYoutubeDaily(userId, previousRange),
      gaPropertyId ? this.fetchGa4Daily(userId, gaPropertyId, currentRange) : Promise.resolve([]),
      gaPropertyId ? this.fetchGa4Daily(userId, gaPropertyId, previousRange) : Promise.resolve([]),
      this.fetchYoutubeChannelSummary(userId)
    ]);

    const timeSeries = this.buildCombinedSeries(currentRange, youtubeCurrent, gaCurrent);

    const youtubeViews = this.sum(youtubeCurrent.map((point) => point.views));
    const subscribersGained = this.sum(youtubeCurrent.map((point) => point.subscribersGained));
    const watchTimeMinutes = this.sum(youtubeCurrent.map((point) => point.estimatedMinutesWatched));
    const subscribersLost = this.sum(youtubeCurrent.map((point) => point.subscribersLost));

    const previousYoutubeViews = this.sum(youtubePrevious.map((point) => point.views));

    const webSessions = this.sum(gaCurrent.map((point) => point.sessions));
    const previousWebSessions = this.sum(gaPrevious.map((point) => point.sessions));

    const youtubeMetrics: YouTubeMetrics = {
      views: youtubeViews,
      watchTimeMinutes,
      subscribers: channelSummary.subscribers,
      subscribersGained,
      subscribersLost,
      topVideos: []
    };

    const ga4Metrics: GA4Metrics = {
      sessions: webSessions,
      newUsers: this.sum(gaCurrent.map((point) => point.newUsers)),
      activeUsers: this.sum(gaCurrent.map((point) => point.activeUsers)),
      bounceRate: this.average(gaCurrent.map((point) => point.bounceRate)),
      averageSessionDuration: this.average(gaCurrent.map((point) => point.averageSessionDuration)),
      pageViews: this.sum(gaCurrent.map((point) => point.pageViews)),
      topPages: [],
      trafficSources: [],
      countries: []
    };

    const pulseScore = this.pulseScoreService.compute(youtubeMetrics, ga4Metrics);

    const previousPulseScore = this.pulseScoreService.compute(
      {
        ...youtubeMetrics,
        views: previousYoutubeViews,
        subscribersGained: this.sum(youtubePrevious.map((point) => point.subscribersGained)),
        subscribersLost: this.sum(youtubePrevious.map((point) => point.subscribersLost)),
        watchTimeMinutes: this.sum(youtubePrevious.map((point) => point.estimatedMinutesWatched))
      },
      {
        ...ga4Metrics,
        sessions: previousWebSessions,
        newUsers: this.sum(gaPrevious.map((point) => point.newUsers)),
        activeUsers: this.sum(gaPrevious.map((point) => point.activeUsers)),
        bounceRate: this.average(gaPrevious.map((point) => point.bounceRate)),
        averageSessionDuration: this.average(gaPrevious.map((point) => point.averageSessionDuration)),
        pageViews: this.sum(gaPrevious.map((point) => point.pageViews))
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
      timeSeries,
      lastUpdatedAt: new Date()
    };
  }

  private async buildYoutubeStats(period: Period, userId: string): Promise<YoutubeStatsDto> {
    await this.ensureSession(userId);

    const periodRange = this.getCurrentRange(period);
    const previousPeriodRange = this.getPreviousRange(period, periodRange);
    const heatmapRange = this.getCustomRange(365);

    const [dailyPeriod, dailyHeatmap, topVideosRaw, previousTopVideosRaw, channelSummary] = await Promise.all([
      this.fetchYoutubeDaily(userId, periodRange),
      this.fetchYoutubeDaily(userId, heatmapRange),
      this.fetchYoutubeTopVideos(userId, periodRange),
      this.fetchYoutubeTopVideos(userId, previousPeriodRange),
      this.fetchYoutubeChannelSummary(userId)
    ]);

    const videoIds = topVideosRaw.map((video) => video.videoId);
    const metadataByVideoId = await this.fetchYoutubeVideoMetadata(userId, videoIds);

    const topVideos = await Promise.all(
      topVideosRaw.map(async (video) => {
        const metadata = metadataByVideoId.get(video.videoId);
        const sparkline = await this.fetchYoutubeVideoSparkline(userId, video.videoId);
        const retentionRate = this.computeRetentionRate(video.averageViewDuration, metadata?.durationSeconds);

        return {
          videoId: video.videoId,
          title: metadata?.title ?? `Video ${video.videoId}`,
          thumbnailUrl: metadata?.thumbnailUrl ?? "",
          views: video.views,
          retentionRate,
          sparkline
        } satisfies YoutubeTopVideoDto;
      })
    );

    const averageRetention = topVideos.length > 0
      ? Number((topVideos.reduce((total, video) => total + video.retentionRate, 0) / topVideos.length).toFixed(1))
      : 0;

    const previousRetention = previousTopVideosRaw.length > 0
      ? Number(
          (
            previousTopVideosRaw.reduce((total, video) => total + this.computeRetentionRate(video.averageViewDuration), 0) /
            previousTopVideosRaw.length
          ).toFixed(1)
        )
      : 0;

    const heatmap = this.buildHeatmap(dailyHeatmap);
    const subscribersSeries = this.buildSubscribersSeries(dailyPeriod, channelSummary.subscribers);

    return {
      period,
      averageRetention,
      averageRetentionDelta: this.computeDelta(averageRetention, previousRetention),
      subscribersTotal: channelSummary.subscribers,
      subscribersGained: this.sum(dailyPeriod.map((point) => point.subscribersGained)),
      heatmap,
      topVideos,
      subscribersSeries,
      lastUpdatedAt: new Date()
    };
  }

  private async buildGa4Stats(period: Period, userId: string): Promise<Ga4StatsDto> {
    await this.ensureSession(userId);

    const currentRange = this.getCurrentRange(period);
    const previousRange = this.getPreviousRange(period, currentRange);
    const gaPropertyId = await this.getRequiredGaPropertyId(userId);

    const [gaCurrent, gaPrevious, trafficSources, topPages, countries] = await Promise.all([
      this.fetchGa4Daily(userId, gaPropertyId, currentRange),
      this.fetchGa4Daily(userId, gaPropertyId, previousRange),
      this.fetchGa4TrafficSources(userId, gaPropertyId, currentRange),
      this.fetchGa4TopPages(userId, gaPropertyId, currentRange),
      this.fetchGa4Countries(userId, gaPropertyId, currentRange)
    ]);

    const sessions = this.sum(gaCurrent.map((point) => point.sessions));
    const previousSessions = this.sum(gaPrevious.map((point) => point.sessions));

    const newUsers = this.sum(gaCurrent.map((point) => point.newUsers));
    const previousNewUsers = this.sum(gaPrevious.map((point) => point.newUsers));

    const bounceRate = this.average(gaCurrent.map((point) => point.bounceRate));
    const previousBounceRate = this.average(gaPrevious.map((point) => point.bounceRate));

    const averageSessionDuration = this.average(gaCurrent.map((point) => point.averageSessionDuration));
    const previousAverageSessionDuration = this.average(gaPrevious.map((point) => point.averageSessionDuration));

    return {
      period,
      gaPropertyId,
      sessions,
      sessionsDelta: this.computeDelta(sessions, previousSessions),
      newUsers,
      newUsersDelta: this.computeDelta(newUsers, previousNewUsers),
      bounceRate,
      bounceRateDelta: this.computeDelta(bounceRate, previousBounceRate),
      averageSessionDuration,
      averageSessionDurationDelta: this.computeDelta(averageSessionDuration, previousAverageSessionDuration),
      trafficSources,
      topPages,
      countries,
      sessionsSeries: this.buildGaSessionsSeries(currentRange, gaCurrent),
      lastUpdatedAt: new Date()
    };
  }

  private async buildCorrelations(period: Period, userId: string): Promise<CorrelationDto> {
    await this.ensureSession(userId);

    const currentRange = this.getCurrentRange(period);
    const gaPropertyId = await this.getRequiredGaPropertyId(userId);

    const [youtubeCurrent, gaCurrent] = await Promise.all([
      this.fetchYoutubeDaily(userId, currentRange),
      this.fetchGa4Daily(userId, gaPropertyId, currentRange)
    ]);

    const series = this.buildCombinedSeries(currentRange, youtubeCurrent, gaCurrent);
    const score = this.correlationService.compute(series);
    const lagged = this.correlationService.findBestLag(series, 7);
    const insight = this.correlationService.buildInsight(lagged.score, lagged.lagDays);

    return {
      period,
      score,
      lagDays: lagged.lagDays,
      laggedScore: lagged.score,
      insight,
      points: this.buildCorrelationPoints(series),
      events: this.buildCorrelationEvents(series),
      lastUpdatedAt: new Date()
    };
  }

  private buildCombinedSeries(
    range: DateRange,
    youtubePoints: YoutubeDailyMetrics[],
    gaPoints: Ga4DailyMetrics[]
  ): CombinedSeriesPoint[] {
    const youtubeByDate = new Map(youtubePoints.map((point) => [point.date, point]));
    const gaByDate = new Map(gaPoints.map((point) => [point.date, point]));

    return this.listDates(range.start, range.end).map((date) => ({
      date,
      youtubeViews: youtubeByDate.get(date)?.views ?? 0,
      webSessions: gaByDate.get(date)?.sessions ?? 0
    }));
  }

  private buildGaSessionsSeries(range: DateRange, gaPoints: Ga4DailyMetrics[]): Ga4SessionPointDto[] {
    const gaByDate = new Map(gaPoints.map((point) => [point.date, point]));

    return this.listDates(range.start, range.end).map((date) => ({
      date,
      sessions: gaByDate.get(date)?.sessions ?? 0
    }));
  }

  private buildCorrelationPoints(points: CombinedSeriesPoint[]): CorrelationPointDto[] {
    const maxYoutube = Math.max(1, ...points.map((point) => point.youtubeViews));
    const maxWeb = Math.max(1, ...points.map((point) => point.webSessions));

    return points.map((point) => ({
      date: point.date,
      youtubeViews: point.youtubeViews,
      webSessions: point.webSessions,
      youtubeNormalized: Number(((point.youtubeViews / maxYoutube) * 100).toFixed(1)),
      webSessionsNormalized: Number(((point.webSessions / maxWeb) * 100).toFixed(1))
    }));
  }

  private buildCorrelationEvents(points: CombinedSeriesPoint[]): CorrelationEventDto[] {
    if (points.length === 0) {
      return [];
    }

    const meanYoutube = this.average(points.map((point) => point.youtubeViews));
    const threshold = meanYoutube * 1.35;

    const peaks = points
      .filter((point, index, allPoints) => {
        if (point.youtubeViews <= 0) {
          return false;
        }

        const previous = allPoints[index - 1]?.youtubeViews ?? -1;
        const next = allPoints[index + 1]?.youtubeViews ?? -1;
        const isLocalMax = point.youtubeViews >= previous && point.youtubeViews >= next;
        const isSignificant = point.youtubeViews >= threshold;

        return isLocalMax && isSignificant;
      })
      .sort((a, b) => b.youtubeViews - a.youtubeViews)
      .slice(0, 3)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (peaks.length === 0) {
      const strongest = points.reduce((best, current) => (
        current.youtubeViews > best.youtubeViews ? current : best
      ));

      return [
        {
          date: strongest.date,
          label: "Pic video",
          type: "youtube_peak"
        }
      ];
    }

    return peaks.map((peak, index) => ({
      date: peak.date,
      label: `Pic video ${index + 1}`,
      type: "youtube_peak"
    }));
  }

  private buildHeatmap(points: YoutubeDailyMetrics[]): YoutubeHeatmapCellDto[] {
    const views = points.map((point) => point.views).sort((a, b) => a - b);
    const thresholds = [0.2, 0.4, 0.6, 0.8].map((p) => views[Math.floor((views.length - 1) * p)] ?? 0);
    const t0 = thresholds[0] ?? 0;
    const t1 = thresholds[1] ?? 0;
    const t2 = thresholds[2] ?? 0;
    const t3 = thresholds[3] ?? 0;

    return points.map((point) => ({
      date: point.date,
      views: point.views,
      intensity:
        point.views <= t0
          ? 1
          : point.views <= t1
            ? 2
            : point.views <= t2
              ? 3
              : point.views <= t3
                ? 4
                : 5
    }));
  }

  private buildSubscribersSeries(
    points: YoutubeDailyMetrics[],
    currentSubscribers: number
  ): YoutubeSubscriberPointDto[] {
    const netGains = points.map((point) => point.subscribersGained - point.subscribersLost);
    const netTotal = this.sum(netGains);
    let subscribers = Math.max(0, currentSubscribers - netTotal);

    return points.map((point) => {
      const net = point.subscribersGained - point.subscribersLost;
      subscribers += net;

      return {
        date: point.date,
        subscribers,
        subscribersGained: point.subscribersGained
      };
    });
  }

  private async fetchYoutubeDaily(userId: string, range: DateRange): Promise<YoutubeDailyMetrics[]> {
    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: range.start,
      endDate: range.end,
      metrics: "views,subscribersGained,subscribersLost,estimatedMinutesWatched",
      dimensions: "day",
      sort: "day"
    });

    const response = await this.fetchGoogleApi<{
      rows?: Array<[string, number, number, number, number]>;
    }>(userId, `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`);

    return (response.rows ?? []).map((row) => ({
      date: row[0],
      views: Number(row[1] ?? 0),
      subscribersGained: Number(row[2] ?? 0),
      subscribersLost: Number(row[3] ?? 0),
      estimatedMinutesWatched: Number(row[4] ?? 0)
    }));
  }

  private async fetchYoutubeTopVideos(userId: string, range: DateRange): Promise<YoutubeVideoMetric[]> {
    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: range.start,
      endDate: range.end,
      metrics: "views,averageViewDuration",
      dimensions: "video",
      sort: "-views",
      maxResults: "5"
    });

    const response = await this.fetchGoogleApi<{
      rows?: Array<[string, number, number]>;
    }>(userId, `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`);

    return (response.rows ?? []).map((row) => ({
      videoId: row[0],
      views: Number(row[1] ?? 0),
      averageViewDuration: Number(row[2] ?? 0)
    }));
  }

  private async fetchYoutubeVideoSparkline(userId: string, videoId: string): Promise<number[]> {
    const range = this.getCustomRange(7);
    const params = new URLSearchParams({
      ids: "channel==MINE",
      startDate: range.start,
      endDate: range.end,
      metrics: "views",
      dimensions: "day",
      filters: `video==${videoId}`,
      sort: "day"
    });

    const response = await this.fetchGoogleApi<{
      rows?: Array<[string, number]>;
    }>(userId, `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`);

    return (response.rows ?? []).map((row) => Number(row[1] ?? 0));
  }

  private async fetchYoutubeVideoMetadata(userId: string, videoIds: string[]): Promise<Map<string, YoutubeVideoMeta>> {
    if (videoIds.length === 0) {
      return new Map();
    }

    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: videoIds.join(","),
      maxResults: "5"
    });

    const response = await this.fetchGoogleApi<{
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          thumbnails?: {
            high?: { url?: string };
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        contentDetails?: {
          duration?: string;
        };
      }>;
    }>(userId, `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);

    const map = new Map<string, YoutubeVideoMeta>();

    for (const item of response.items ?? []) {
      map.set(item.id, {
        title: item.snippet?.title ?? item.id,
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          "",
        durationSeconds: this.parseDurationToSeconds(item.contentDetails?.duration)
      });
    }

    return map;
  }

  private async fetchYoutubeChannelSummary(userId: string): Promise<YoutubeChannelSummary> {
    const params = new URLSearchParams({
      part: "statistics",
      mine: "true"
    });

    const response = await this.fetchGoogleApi<{
      items?: Array<{
        statistics?: {
          subscriberCount?: string;
        };
      }>;
    }>(userId, `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`);

    const subscribers = Number(response.items?.[0]?.statistics?.subscriberCount ?? 0);

    return {
      subscribers
    };
  }

  private async fetchGa4Daily(userId: string, propertyId: string, range: DateRange): Promise<Ga4DailyMetrics[]> {
    const response = await this.fetchGoogleApi<{
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    }>(
      userId,
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: range.start,
              endDate: range.end
            }
          ],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "newUsers" },
            { name: "activeUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "screenPageViews" }
          ],
          limit: "1000"
        })
      }
    );

    return (response.rows ?? []).map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value ?? "";
      const metrics = row.metricValues ?? [];

      return {
        date: this.parseGaDate(rawDate),
        sessions: Number(metrics[0]?.value ?? 0),
        newUsers: Number(metrics[1]?.value ?? 0),
        activeUsers: Number(metrics[2]?.value ?? 0),
        bounceRate: Number(metrics[3]?.value ?? 0),
        averageSessionDuration: Number(metrics[4]?.value ?? 0),
        pageViews: Number(metrics[5]?.value ?? 0)
      };
    });
  }

  private async fetchGa4TrafficSources(
    userId: string,
    propertyId: string,
    range: DateRange
  ): Promise<Ga4TrafficSourceDto[]> {
    const response = await this.fetchGoogleApi<{
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    }>(
      userId,
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: range.start,
              endDate: range.end
            }
          ],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [{ name: "sessions" }],
          orderBys: [
            {
              metric: { metricName: "sessions" },
              desc: true
            }
          ],
          limit: "6"
        })
      }
    );

    const entries: Ga4TrafficSourceMetrics[] = (response.rows ?? []).map((row) => ({
      source: this.normalizeSourceValue(row.dimensionValues?.[0]?.value, "direct"),
      medium: this.normalizeSourceValue(row.dimensionValues?.[1]?.value, "none"),
      sessions: Number(row.metricValues?.[0]?.value ?? 0)
    }));

    return entries
      .filter((entry) => entry.sessions > 0)
      .map((entry) => ({
        source: entry.source,
        medium: entry.medium,
        sessions: entry.sessions
      }));
  }

  private async fetchGa4TopPages(userId: string, propertyId: string, range: DateRange): Promise<Ga4TopPageDto[]> {
    const response = await this.fetchGoogleApi<{
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    }>(
      userId,
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: range.start,
              endDate: range.end
            }
          ],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }],
          orderBys: [
            {
              metric: { metricName: "sessions" },
              desc: true
            }
          ],
          limit: "8"
        })
      }
    );

    const entries: Ga4TopPageMetrics[] = (response.rows ?? []).map((row) => {
      const metrics = row.metricValues ?? [];
      return {
        pagePath: row.dimensionValues?.[0]?.value || "/",
        sessions: Number(metrics[0]?.value ?? 0),
        pageViews: Number(metrics[1]?.value ?? 0),
        averageSessionDuration: Number(metrics[2]?.value ?? 0)
      };
    });

    return entries
      .filter((entry) => entry.sessions > 0)
      .map((entry) => ({
        pagePath: entry.pagePath,
        sessions: entry.sessions,
        pageViews: entry.pageViews,
        averageSessionDuration: entry.averageSessionDuration
      }));
  }

  private async fetchGa4Countries(userId: string, propertyId: string, range: DateRange): Promise<Ga4CountryDto[]> {
    const response = await this.fetchGoogleApi<{
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    }>(
      userId,
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: range.start,
              endDate: range.end
            }
          ],
          dimensions: [{ name: "countryId" }, { name: "country" }],
          metrics: [{ name: "sessions" }],
          orderBys: [
            {
              metric: { metricName: "sessions" },
              desc: true
            }
          ],
          limit: "24"
        })
      }
    );

    const entries: Ga4CountryMetrics[] = (response.rows ?? []).map((row) => ({
      countryCode: this.normalizeCountryCode(row.dimensionValues?.[0]?.value),
      country: row.dimensionValues?.[1]?.value || "Unknown",
      sessions: Number(row.metricValues?.[0]?.value ?? 0)
    }));

    return entries
      .filter((entry) => entry.sessions > 0)
      .map((entry) => ({
        countryCode: entry.countryCode,
        country: entry.country,
        sessions: entry.sessions
      }));
  }

  private async fetchGoogleApi<T>(
    userId: string,
    url: string,
    init?: RequestInit,
    allowRetry = true
  ): Promise<T> {
    const accessToken = await this.authService.getValidGoogleAccessToken(userId);

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(url, {
      ...init,
      headers
    });

    if (response.status === 401 && allowRetry) {
      await this.authService.refreshGoogleAccessToken(userId);
      return this.fetchGoogleApi<T>(userId, url, init, false);
    }

    if (!response.ok) {
      const payload = await response.text();
      throw new HttpException(`Google API request failed: ${payload}`, 502);
    }

    return (await response.json()) as T;
  }

  private async getGaPropertyId(userId: string): Promise<string | undefined> {
    const session = await this.authService.getSession(userId);
    const fromSession = this.normalizeGaPropertyId(session?.gaPropertyId);
    const fromEnv = this.normalizeGaPropertyId(this.configService.get<string>("GOOGLE_GA4_PROPERTY_ID"));
    return fromSession ?? fromEnv ?? undefined;
  }

  private async getRequiredGaPropertyId(userId: string): Promise<string> {
    const existing = await this.getGaPropertyId(userId);
    if (existing) {
      return existing;
    }

    const discovered = await this.discoverGaPropertyId(userId);
    if (discovered) {
      await this.authService.setGaPropertyId(userId, discovered);
      return discovered;
    }

    throw new BadRequestException("GA4 property id missing. Reconnect with gaPropertyId or set GOOGLE_GA4_PROPERTY_ID.");
  }

  private async ensureSession(userId: string): Promise<void> {
    const session = await this.authService.getSession(userId);
    if (!session) {
      throw new UnauthorizedException("Google account not connected. Please login first.");
    }
  }

  private getCurrentRange(period: Period): DateRange {
    return this.getCustomRange(DAYS_BY_PERIOD[period]);
  }

  private getCustomRange(days: number): DateRange {
    const end = this.todayUtc();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    return {
      start: this.toIsoDate(start),
      end: this.toIsoDate(end)
    };
  }

  private getPreviousRange(period: Period, currentRange: DateRange): DateRange {
    const days = DAYS_BY_PERIOD[period];
    const currentStart = new Date(`${currentRange.start}T00:00:00.000Z`);
    const previousEnd = new Date(currentStart);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - (days - 1));

    return {
      start: this.toIsoDate(previousStart),
      end: this.toIsoDate(previousEnd)
    };
  }

  private listDates(startIso: string, endIso: string): string[] {
    const dates: string[] = [];
    const start = new Date(`${startIso}T00:00:00.000Z`);
    const end = new Date(`${endIso}T00:00:00.000Z`);

    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      dates.push(this.toIsoDate(cursor));
    }

    return dates;
  }

  private todayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private parseGaDate(rawDate: string): string {
    if (!/^\d{8}$/.test(rawDate)) {
      return rawDate;
    }

    const year = rawDate.slice(0, 4);
    const month = rawDate.slice(4, 6);
    const day = rawDate.slice(6, 8);

    return `${year}-${month}-${day}`;
  }

  private normalizeSourceValue(value: string | undefined, fallback: string): string {
    if (!value || value === "(not set)") {
      return fallback;
    }

    return value;
  }

  private normalizeCountryCode(code: string | undefined): string {
    if (!code || code === "(not set)") {
      return "UN";
    }

    const upper = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) {
      return "UN";
    }

    return upper;
  }

  private normalizeGaPropertyId(raw: string | undefined): string | undefined {
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }

    const unprefixed = trimmed.startsWith("properties/") ? trimmed.slice("properties/".length) : trimmed;
    if (!/^\d+$/.test(unprefixed)) {
      return undefined;
    }

    return unprefixed;
  }

  private async discoverGaPropertyId(userId: string): Promise<string | undefined> {
    let response: {
      accountSummaries?: Array<{
        propertySummaries?: Array<{
          property?: string;
        }>;
      }>;
    };

    try {
      response = await this.fetchGoogleApi<{
        accountSummaries?: Array<{
          propertySummaries?: Array<{
            property?: string;
          }>;
        }>;
      }>(userId, "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200");
    } catch {
      return undefined;
    }

    for (const account of response.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        const normalized = this.normalizeGaPropertyId(property.property);
        if (normalized) {
          return normalized;
        }
      }
    }

    return undefined;
  }

  private computeRetentionRate(averageViewDurationSeconds: number, durationSeconds = 420): number {
    const safeDuration = durationSeconds > 0 ? durationSeconds : 420;
    const retention = (averageViewDurationSeconds / safeDuration) * 100;
    return Number(Math.max(5, Math.min(95, retention)).toFixed(1));
  }

  private parseDurationToSeconds(duration?: string): number {
    if (!duration) {
      return 0;
    }

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return 0;
    }

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return this.sum(values) / values.length;
  }

  private computeDelta(current: number, previous: number): number {
    if (previous <= 0) {
      return 0;
    }

    const raw = ((current - previous) / previous) * 100;
    return Number(raw.toFixed(1));
  }
}

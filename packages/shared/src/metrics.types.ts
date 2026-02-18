export interface YouTubeTopVideo {
  videoId: string;
  title: string;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  thumbnailUrl: string;
}

export interface YouTubeMetrics {
  views: number;
  watchTimeMinutes: number;
  subscribers: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedRevenue?: number;
  topVideos: YouTubeTopVideo[];
}

export interface GA4TopPage {
  pagePath: string;
  pageViews: number;
  averageTimeOnPage: number;
}

export interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
}

export interface GA4Country {
  countryCode: string;
  sessions: number;
}

export interface GA4Metrics {
  sessions: number;
  newUsers: number;
  activeUsers: number;
  bounceRate: number;
  averageSessionDuration: number;
  pageViews: number;
  topPages: GA4TopPage[];
  trafficSources: GA4TrafficSource[];
  countries: GA4Country[];
}

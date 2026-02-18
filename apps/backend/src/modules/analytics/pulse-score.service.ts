import { Injectable } from "@nestjs/common";
import type { GA4Metrics, YouTubeMetrics } from "@pulse/shared";

@Injectable()
export class PulseScoreService {
  compute(youtube: YouTubeMetrics, ga4: GA4Metrics): number {
    const ytGrowth = this.normalize(youtube.subscribersGained);
    const ytEngagement = youtube.views === 0 ? 0 : youtube.watchTimeMinutes / youtube.views;
    const ytReach = this.normalize(youtube.views);
    const gaGrowth = this.normalize(ga4.newUsers);
    const gaEngagement = 1 - ga4.bounceRate;
    const gaReach = this.normalize(ga4.sessions);

    const raw =
      ytGrowth * 0.25 +
      ytEngagement * 0.2 +
      ytReach * 0.2 +
      gaGrowth * 0.15 +
      gaEngagement * 0.1 +
      gaReach * 0.1;

    return Math.round(raw * 1000);
  }

  private normalize(value: number): number {
    if (value <= 0) {
      return 0;
    }

    return Math.min(1, Math.log10(value + 1) / 6);
  }
}

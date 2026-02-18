import { Injectable } from "@nestjs/common";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";

@Injectable()
export class AnalyticsService {
  async getOverview(): Promise<OverviewDto> {
    return {
      youtubeViews: 28_400,
      youtubeViewsDelta: 18.4,
      subscribersGained: 1120,
      webSessions: 9_120,
      webSessionsDelta: -7.2,
      pulseScore: 847,
      pulseScoreDelta: -2,
      timeSeries: [],
      lastUpdatedAt: new Date()
    };
  }
}

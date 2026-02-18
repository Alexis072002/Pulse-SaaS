import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { CorrelationDto } from "~/modules/analytics/dto/correlation-response.dto";
import { Ga4StatsDto } from "~/modules/analytics/dto/ga4-stats-response.dto";
import { GetOverviewDto } from "~/modules/analytics/dto/get-overview.dto";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";
import { YoutubeStatsDto } from "~/modules/analytics/dto/youtube-stats-response.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async getOverview(
    @CurrentUser() user: { id: string },
    @Query() query: GetOverviewDto
  ): Promise<OverviewDto> {
    return this.analyticsService.getOverview(query.period, user.id);
  }

  @Get("youtube")
  async getYoutubeStats(
    @CurrentUser() user: { id: string },
    @Query() query: GetOverviewDto
  ): Promise<YoutubeStatsDto> {
    return this.analyticsService.getYoutubeStats(query.period, user.id);
  }

  @Get("ga4")
  async getGa4Stats(
    @CurrentUser() user: { id: string },
    @Query() query: GetOverviewDto
  ): Promise<Ga4StatsDto> {
    return this.analyticsService.getGa4Stats(query.period, user.id);
  }

  @Get("correlations")
  async getCorrelations(
    @CurrentUser() user: { id: string },
    @Query() query: GetOverviewDto
  ): Promise<CorrelationDto> {
    return this.analyticsService.getCorrelations(query.period, user.id);
  }
}

import { Controller, Get, Query } from "@nestjs/common";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { GetOverviewDto } from "~/modules/analytics/dto/get-overview.dto";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async getOverview(@Query() _query: GetOverviewDto): Promise<OverviewDto> {
    return this.analyticsService.getOverview();
  }
}

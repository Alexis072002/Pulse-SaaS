import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "~/common/decorators/public.decorator";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { GetOverviewDto } from "~/modules/analytics/dto/get-overview.dto";
import { OverviewDto } from "~/modules/analytics/dto/overview-response.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get("overview")
  async getOverview(@Query() query: GetOverviewDto): Promise<OverviewDto> {
    return this.analyticsService.getOverview(query.period);
  }
}

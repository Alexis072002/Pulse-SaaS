import { Module } from "@nestjs/common";
import { AuthModule } from "~/modules/auth/auth.module";
import { AnalyticsController } from "~/modules/analytics/analytics.controller";
import { AnalyticsService } from "~/modules/analytics/analytics.service";
import { CacheService } from "~/modules/analytics/cache.service";
import { CorrelationService } from "~/modules/analytics/correlation/correlation.service";
import { PulseScoreService } from "~/modules/analytics/pulse-score.service";

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, CorrelationService, PulseScoreService, CacheService],
  exports: [AnalyticsService, CorrelationService, PulseScoreService, CacheService]
})
export class AnalyticsModule {}

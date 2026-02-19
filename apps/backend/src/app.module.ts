import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import { JwtAuthGuard } from "~/common/guards/jwt-auth.guard";
import { RolesGuard } from "~/common/guards/roles.guard";
import { RouteRateLimitGuard } from "~/common/guards/route-rate-limit.guard";
import appConfig from "~/config/app.config";
import databaseConfig from "~/config/database.config";
import redisConfig from "~/config/redis.config";
import { validationSchema } from "~/config/validation.schema";
import { AuditModule } from "~/modules/audit/audit.module";
import { AiModule } from "~/modules/ai/ai.module";
import { AnalyticsModule } from "~/modules/analytics/analytics.module";
import { AuthModule } from "~/modules/auth/auth.module";
import { OpsModule } from "~/modules/ops/ops.module";
import { QueueModule } from "~/modules/queue/queue.module";
import { ReportsModule } from "~/modules/reports/reports.module";
import { WorkspaceModule } from "~/modules/workspace/workspace.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), "../../.env"), resolve(process.cwd(), ".env")],
      load: [appConfig, databaseConfig, redisConfig],
      validationSchema
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ]),
    AuthModule,
    WorkspaceModule,
    AnalyticsModule,
    OpsModule,
    ReportsModule,
    AiModule,
    QueueModule,
    AuditModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: RouteRateLimitGuard
    }
  ]
})
export class AppModule {}

import { Controller, Get, Headers, Query } from "@nestjs/common";
import { RouteRateLimit } from "~/common/decorators/route-rate-limit.decorator";
import { GetLogsDto } from "~/modules/ops/dto/get-logs.dto";
import { OpsService } from "~/modules/ops/ops.service";

@Controller("ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("health")
  @RouteRateLimit({ limit: 60, windowMs: 60_000 })
  async health(
    @Headers("x-ops-key") keyFromHeader?: string,
    @Query("key") keyFromQuery?: string
  ): Promise<Awaited<ReturnType<OpsService["getHealth"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? keyFromQuery);
    return this.opsService.getHealth();
  }

  @Get("metrics")
  @RouteRateLimit({ limit: 60, windowMs: 60_000 })
  async metrics(
    @Headers("x-ops-key") keyFromHeader?: string,
    @Query("key") keyFromQuery?: string
  ): Promise<Awaited<ReturnType<OpsService["getMetrics"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? keyFromQuery);
    return this.opsService.getMetrics();
  }

  @Get("logs")
  @RouteRateLimit({ limit: 40, windowMs: 60_000 })
  async logs(
    @Headers("x-ops-key") keyFromHeader: string | undefined,
    @Query() query: GetLogsDto
  ): Promise<Awaited<ReturnType<OpsService["getLogs"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? query.key);
    return this.opsService.getLogs(query.limit);
  }

  @Get("audit")
  @RouteRateLimit({ limit: 30, windowMs: 60_000 })
  async audit(
    @Headers("x-ops-key") keyFromHeader: string | undefined,
    @Query() query: GetLogsDto
  ): Promise<Awaited<ReturnType<OpsService["getAuditLogs"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? query.key);
    return this.opsService.getAuditLogs(query.limit);
  }
}

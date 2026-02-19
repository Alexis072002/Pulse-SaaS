import { Controller, Get, Headers, Query } from "@nestjs/common";
import { GetLogsDto } from "~/modules/ops/dto/get-logs.dto";
import { OpsService } from "~/modules/ops/ops.service";

@Controller("ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("health")
  async health(
    @Headers("x-ops-key") keyFromHeader?: string,
    @Query("key") keyFromQuery?: string
  ): Promise<Awaited<ReturnType<OpsService["getHealth"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? keyFromQuery);
    return this.opsService.getHealth();
  }

  @Get("metrics")
  async metrics(
    @Headers("x-ops-key") keyFromHeader?: string,
    @Query("key") keyFromQuery?: string
  ): Promise<Awaited<ReturnType<OpsService["getMetrics"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? keyFromQuery);
    return this.opsService.getMetrics();
  }

  @Get("logs")
  async logs(
    @Headers("x-ops-key") keyFromHeader: string | undefined,
    @Query() query: GetLogsDto
  ): Promise<Awaited<ReturnType<OpsService["getLogs"]>>> {
    this.opsService.assertAccess(keyFromHeader ?? query.key);
    return this.opsService.getLogs(query.limit);
  }
}

import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { ReportsService } from "~/modules/reports/reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(@CurrentUser() user: { id: string } | undefined): Promise<Array<{ id: string; userId: string; status: string }>> {
    const userId = user?.id ?? "anonymous";
    return this.reportsService.listReports(userId);
  }
}

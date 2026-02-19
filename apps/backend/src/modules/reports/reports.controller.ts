import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ReportType, WorkspaceRole } from "@prisma/client";
import type { Response } from "express";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { Roles } from "~/common/decorators/roles.decorator";
import { RouteRateLimit } from "~/common/decorators/route-rate-limit.decorator";
import { CreateReportDto } from "~/modules/reports/dto/create-report.dto";
import { ListReportsDto } from "~/modules/reports/dto/list-reports.dto";
import { UpdateReportScheduleDto } from "~/modules/reports/dto/update-report-schedule.dto";
import { ReportListItem, ReportScheduleItem, ReportsService } from "~/modules/reports/reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @CurrentUser() user: { id: string },
    @Query() query: ListReportsDto
  ): Promise<ReportListItem[]> {
    return this.reportsService.listReports(user.id, {
      type: query.type,
      status: query.status
    });
  }

  @Get("schedules")
  async getSchedules(@CurrentUser() user: { id: string }): Promise<ReportScheduleItem[]> {
    return this.reportsService.listSchedules(user.id);
  }

  @Post("schedules/:type")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 30, windowMs: 60_000 })
  async updateSchedule(
    @CurrentUser() user: { id: string },
    @Param("type") typeRaw: string,
    @Body() body: UpdateReportScheduleDto
  ): Promise<ReportScheduleItem> {
    const type = typeRaw === ReportType.MONTHLY ? ReportType.MONTHLY : ReportType.WEEKLY;
    return this.reportsService.updateSchedule(user.id, type, body);
  }

  @Post("generate")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 8, windowMs: 60_000 })
  async generateReport(
    @CurrentUser() user: { id: string },
    @Body() body: CreateReportDto
  ): Promise<ReportListItem> {
    const type = body.type ?? ReportType.WEEKLY;
    return this.reportsService.createReport(user.id, type);
  }

  @Post(":id/retry")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 8, windowMs: 60_000 })
  async retryReport(
    @CurrentUser() user: { id: string },
    @Param("id") reportId: string
  ): Promise<ReportListItem> {
    return this.reportsService.retryReport(reportId, user.id);
  }

  @Post(":id/deliveries/:deliveryId/retry")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 8, windowMs: 60_000 })
  async retryDelivery(
    @CurrentUser() user: { id: string },
    @Param("id") reportId: string,
    @Param("deliveryId") deliveryId: string
  ): Promise<ReportListItem> {
    return this.reportsService.retryDelivery(reportId, deliveryId, user.id);
  }

  @Get(":id/download")
  async downloadReport(
    @CurrentUser() user: { id: string },
    @Param("id") reportId: string,
    @Res() response: Response
  ): Promise<void> {
    const { fileName, content } = await this.reportsService.getDownload(reportId, user.id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    response.status(200).send(content);
  }
}

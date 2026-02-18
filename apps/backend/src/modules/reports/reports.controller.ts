import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ReportType } from "@prisma/client";
import type { Response } from "express";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { CreateReportDto } from "~/modules/reports/dto/create-report.dto";
import { ListReportsDto } from "~/modules/reports/dto/list-reports.dto";
import { ReportListItem, ReportsService } from "~/modules/reports/reports.service";

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

  @Post("generate")
  async generateReport(
    @CurrentUser() user: { id: string },
    @Body() body: CreateReportDto
  ): Promise<ReportListItem> {
    const type = body.type ?? ReportType.WEEKLY;
    return this.reportsService.createReport(user.id, type);
  }

  @Post(":id/retry")
  async retryReport(
    @CurrentUser() user: { id: string },
    @Param("id") reportId: string
  ): Promise<ReportListItem> {
    return this.reportsService.retryReport(reportId, user.id);
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

import { Module } from "@nestjs/common";
import { AiModule } from "~/modules/ai/ai.module";
import { AnalyticsModule } from "~/modules/analytics/analytics.module";
import { QueueModule } from "~/modules/queue/queue.module";
import { EmailService } from "~/modules/reports/email/email.service";
import { PdfService } from "~/modules/reports/pdf/pdf.service";
import { ReportsController } from "~/modules/reports/reports.controller";
import { ReportsService } from "~/modules/reports/reports.service";
import { PrismaService } from "~/prisma/prisma.service";

@Module({
  imports: [AiModule, AnalyticsModule, QueueModule],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, PdfService, EmailService],
  exports: [ReportsService]
})
export class ReportsModule {}

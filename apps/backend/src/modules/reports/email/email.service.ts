import { Injectable, Logger } from "@nestjs/common";

interface SendReportEmailInput {
  userId: string;
  reportId: string;
  reportType: "WEEKLY" | "MONTHLY";
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendReportReadyEmail(input: SendReportEmailInput): Promise<void> {
    this.logger.log(
      `Report ready notification queued (user=${input.userId}, report=${input.reportId}, type=${input.reportType}).`
    );
  }
}

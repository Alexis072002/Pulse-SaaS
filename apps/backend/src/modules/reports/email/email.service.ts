import { Injectable, Logger } from "@nestjs/common";
import { sendBrevoTransactionalEmail } from "~/common/integrations/brevo";

interface SendReportEmailInput {
  userId: string;
  recipientEmail: string;
  reportId: string;
  reportType: "WEEKLY" | "MONTHLY";
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendReportReadyEmail(input: SendReportEmailInput): Promise<void> {
    const appUrl = process.env.FRONTEND_APP_URL?.trim() || "http://localhost:3000";
    const reportsUrl = `${appUrl}/reports`;

    const subject = input.reportType === "WEEKLY"
      ? "Pulse: ton rapport hebdo est prêt"
      : "Pulse: ton rapport mensuel est prêt";

    const htmlContent = `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin:0 0 12px;">Rapport prêt</h2>
        <p>Ton rapport <strong>${input.reportType.toLowerCase()}</strong> est disponible dans Pulse.</p>
        <p style="margin:20px 0;">
          <a href="${reportsUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#b35c0c;color:#fff;text-decoration:none;font-weight:600;">
            Ouvrir mes rapports
          </a>
        </p>
        <p style="font-size:12px;color:#64748b;">Report ID: ${input.reportId}</p>
      </div>
    `;

    const sent = await sendBrevoTransactionalEmail(
      {
        to: input.recipientEmail,
        subject,
        htmlContent,
        textContent: `Ton rapport ${input.reportType.toLowerCase()} est prêt. Ouvre ${reportsUrl}`
      },
      this.logger
    );

    if (sent) {
      this.logger.log(`Report email sent (user=${input.userId}, report=${input.reportId}, to=${input.recipientEmail}).`);
      return;
    }

    this.logger.log(
      `Report ready notification skipped (user=${input.userId}, report=${input.reportId}, type=${input.reportType}).`
    );
  }
}

interface SendBrevoEmailInput {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface LoggerLike {
  log: (message: string) => void;
  warn: (message: string) => void;
}

export async function sendBrevoTransactionalEmail(
  input: SendBrevoEmailInput,
  logger?: LoggerLike
): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Pulse Analytics";

  if (!apiKey || !senderEmail) {
    logger?.log("Brevo not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL missing), email skipped.");
    return false;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${payload.slice(0, 240)}`);
  }

  return true;
}

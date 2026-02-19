import { Injectable, Logger } from "@nestjs/common";

export interface ReportPdfPayload {
  title: string;
  periodLabel: string;
  generatedAt: string;
  kpis: Array<{ label: string; value: string }>;
  digest: string;
}

type DynamicImportFn = (moduleName: string) => Promise<unknown>;

interface PuppeteerPage {
  setContent: (html: string, options?: { waitUntil?: string }) => Promise<void>;
  pdf: (options?: Record<string, unknown>) => Promise<Buffer | Uint8Array>;
}

interface PuppeteerBrowser {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
}

interface PuppeteerLike {
  launch: (options?: Record<string, unknown>) => Promise<PuppeteerBrowser>;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async render(payload: ReportPdfPayload): Promise<Buffer> {
    try {
      const puppeteerBuffer = await this.renderWithPuppeteer(payload);
      if (puppeteerBuffer) {
        return puppeteerBuffer;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown puppeteer error";
      this.logger.warn(`Puppeteer render failed, fallback to embedded PDF generator: ${message}`);
    }

    return this.renderFallbackPdf(payload);
  }

  private async renderWithPuppeteer(payload: ReportPdfPayload): Promise<Buffer | null> {
    const dynamicImport = (new Function("moduleName", "return import(moduleName);") as DynamicImportFn);
    const imported = await dynamicImport("puppeteer");
    const puppeteer = this.resolvePuppeteer(imported);
    if (!puppeteer) {
      return null;
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildHtmlTemplate(payload), { waitUntil: "networkidle0" });
      const data = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "24px",
          left: "20px"
        }
      });
      return Buffer.isBuffer(data) ? data : Buffer.from(data);
    } finally {
      await browser.close();
    }
  }

  private resolvePuppeteer(imported: unknown): PuppeteerLike | null {
    if (typeof imported !== "object" || imported === null) {
      return null;
    }

    const candidate = imported as Record<string, unknown>;
    if (candidate.default && typeof candidate.default === "object") {
      const nested = candidate.default as Record<string, unknown>;
      if (typeof nested.launch === "function") {
        return nested as unknown as PuppeteerLike;
      }
    }

    if (typeof candidate.launch === "function") {
      return candidate as unknown as PuppeteerLike;
    }

    return null;
  }

  private buildHtmlTemplate(payload: ReportPdfPayload): string {
    const kpiCards = payload.kpis
      .map(
        (kpi) => `
        <div class="kpi-card">
          <p class="kpi-label">${this.escapeHtml(kpi.label)}</p>
          <p class="kpi-value">${this.escapeHtml(kpi.value)}</p>
        </div>
      `
      )
      .join("");

    return `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${this.escapeHtml(payload.title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #0f172a;
            background: #f8fafc;
          }
          .sheet {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            padding: 24px;
          }
          .header {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          .meta {
            margin-top: 8px;
            color: #475569;
            font-size: 12px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px;
            background: #f8fafc;
          }
          .kpi-label {
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 10px;
            color: #64748b;
          }
          .kpi-value {
            margin: 8px 0 0 0;
            font-family: "SFMono-Regular", Menlo, Monaco, monospace;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }
          .digest-title {
            margin: 0 0 8px 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #334155;
          }
          .digest {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: #1e293b;
          }
          .footer {
            margin-top: 18px;
            font-size: 11px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <section class="header">
            <h1 class="title">${this.escapeHtml(payload.title)}</h1>
            <p class="meta">Period: ${this.escapeHtml(payload.periodLabel)}</p>
            <p class="meta">Generated at: ${this.escapeHtml(payload.generatedAt)}</p>
          </section>
          <section class="kpi-grid">
            ${kpiCards}
          </section>
          <section>
            <h2 class="digest-title">Digest</h2>
            <p class="digest">${this.escapeHtml(payload.digest)}</p>
          </section>
          <p class="footer">Pulse Reports V2 - Generated automatically.</p>
        </main>
      </body>
      </html>
    `;
  }

  private renderFallbackPdf(payload: ReportPdfPayload): Buffer {
    const lines = [
      payload.title,
      `Period: ${payload.periodLabel}`,
      `Generated at: ${payload.generatedAt}`,
      "",
      "KPI Summary",
      ...payload.kpis.map((item) => `- ${item.label}: ${item.value}`),
      "",
      "AI Digest",
      ...this.wrapText(payload.digest, 95)
    ];

    return this.buildSinglePagePdf(lines.slice(0, 40));
  }

  private buildSinglePagePdf(lines: string[]): Buffer {
    const sanitizedLines = lines.map((line) => this.escapePdfText(this.toAscii(line)));
    const contentStream = [
      "BT",
      "/F1 12 Tf",
      "14 TL",
      "50 760 Td",
      ...sanitizedLines.map((line, index) => (index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`)),
      "ET"
    ].join("\n");

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index <= objects.length; index += 1) {
      const offset = String(offsets[index]).padStart(10, "0");
      pdf += `${offset} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, "utf8");
  }

  private wrapText(text: string, maxChars: number): string[] {
    const normalized = this.toAscii(text).replace(/\s+/g, " ").trim();
    if (!normalized) {
      return ["No digest available for this period."];
    }

    const words = normalized.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= maxChars) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private escapePdfText(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private toAscii(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }
}

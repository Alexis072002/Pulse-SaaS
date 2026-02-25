import { Injectable, Logger } from "@nestjs/common";

export interface ReportPdfPayload {
  title: string;
  periodLabel: string;
  generatedAt: string;
  kpis: Array<{ label: string; value: string }>;
  digest: string;
  highlights?: string[];
  recommendations?: string[];
  nextActions?: string[];
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
    const highlights = (payload.highlights ?? [])
      .map((line) => this.escapeHtml(line))
      .filter((line) => line.length > 0)
      .slice(0, 4);

    const recommendations = (payload.recommendations ?? [])
      .map((line) => this.escapeHtml(line))
      .filter((line) => line.length > 0)
      .slice(0, 5);

    const nextActions = (
      payload.nextActions ?? [
        "Valider les priorités de la semaine en équipe.",
        "Re-lancer les tests des contenus clés.",
        "Comparer les écarts avec le cycle précédent."
      ]
    )
      .map((line) => this.escapeHtml(line))
      .filter((line) => line.length > 0)
      .slice(0, 4);

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

    const highlightsHtml = highlights.length > 0
      ? highlights.map((line) => `<li>${line}</li>`).join("")
      : `<li>${this.escapeHtml("Aucun highlight disponible sur cette période.")}</li>`;

    const recommendationsHtml = recommendations.length > 0
      ? recommendations.map((line) => `<li>${line}</li>`).join("")
      : `<li>${this.escapeHtml("Continuer la cadence et monitorer les KPIs clés.")}</li>`;

    const nextActionsHtml = nextActions.map((line) => `<li>${line}</li>`).join("");

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
            padding: 26px;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #0f172a;
            background: linear-gradient(180deg, #f5f8ff 0%, #eef3fc 100%);
          }
          .sheet {
            background: #ffffff;
            border: 1px solid #dce5f5;
            border-radius: 20px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          }
          .header-band {
            background: linear-gradient(104deg, #9f500b 0%, #f59e0b 52%, #f97316 100%);
            padding: 22px 26px 18px;
            color: #fff;
          }
          .header-kicker {
            margin: 0;
            font-size: 11px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.85);
          }
          .title {
            margin: 8px 0 0;
            font-size: 29px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #ffffff;
          }
          .meta {
            margin-top: 12px;
            color: rgba(255, 255, 255, 0.85);
            font-size: 12px;
          }
          .content {
            padding: 22px 26px 24px;
          }
          .section-title {
            margin: 0 0 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #475569;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 18px;
          }
          .kpi-card {
            border: 1px solid #dee7f6;
            border-radius: 12px;
            padding: 12px;
            background: #f8fbff;
          }
          .kpi-label {
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 9px;
            color: #5f708d;
          }
          .kpi-value {
            margin: 10px 0 0 0;
            font-family: "SFMono-Regular", Menlo, Monaco, monospace;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .digest-box {
            border: 1px solid #dee7f6;
            background: #f8fbff;
            border-radius: 14px;
            padding: 14px;
          }
          .digest {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: #243247;
          }
          .footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e6edf8;
            font-size: 10px;
            color: #64748b;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .sheet-second {
            margin-top: 18px;
            page-break-before: always;
            break-before: page;
          }
          .header-band-blue {
            background: linear-gradient(98deg, #14213d 0%, #273d70 60%, #3555a0 100%);
            padding: 20px 26px 16px;
            color: #fff;
          }
          .insight-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .insight-card {
            border: 1px solid #dee7f6;
            border-radius: 14px;
            background: #f8fbff;
            padding: 14px;
          }
          .insight-card h3 {
            margin: 0 0 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #5f708d;
          }
          .insight-card ul,
          .insight-card ol {
            margin: 0;
            padding-left: 18px;
          }
          .insight-card li {
            margin-bottom: 7px;
            font-size: 12px;
            line-height: 1.45;
            color: #243247;
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <section class="header-band">
            <p class="header-kicker">Pulse Executive Report</p>
            <h1 class="title">${this.escapeHtml(payload.title)}</h1>
            <p class="meta">Period: ${this.escapeHtml(payload.periodLabel)}</p>
            <p class="meta">Generated at: ${this.escapeHtml(payload.generatedAt)}</p>
          </section>
          <section class="content">
            <h2 class="section-title">Key Metrics</h2>
            <section class="kpi-grid">
              ${kpiCards}
            </section>
            <h2 class="section-title">AI Digest</h2>
            <section class="digest-box">
              <p class="digest">${this.escapeHtml(payload.digest)}</p>
            </section>
            <p class="footer">Pulse Analytics • Confidential demo report</p>
          </section>
        </main>
        <main class="sheet sheet-second">
          <section class="header-band-blue">
            <p class="header-kicker">Pulse Executive Report</p>
            <h1 class="title">Insights & Action Plan</h1>
            <p class="meta">From the same reporting window: ${this.escapeHtml(payload.periodLabel)}</p>
          </section>
          <section class="content">
            <section class="insight-grid">
              <article class="insight-card">
                <h3>Highlights</h3>
                <ul>
                  ${highlightsHtml}
                </ul>
              </article>
              <article class="insight-card">
                <h3>Recommendations</h3>
                <ol>
                  ${recommendationsHtml}
                </ol>
              </article>
            </section>
            <section class="insight-card" style="margin-top:14px;">
              <h3>Next Cycle Checklist</h3>
              <ul>
                ${nextActionsHtml}
              </ul>
            </section>
            <p class="footer">Pulse Analytics • Decision-ready output</p>
          </section>
        </main>
      </body>
      </html>
    `;
  }

  private renderFallbackPdf(payload: ReportPdfPayload): Buffer {
    const safeTitle = this.toAscii(payload.title) || "Pulse Analytics Report";
    const safePeriod = this.toAscii(payload.periodLabel) || "N/A";
    const safeGeneratedAt = this.toAscii(payload.generatedAt) || new Date().toISOString();

    const kpis = payload.kpis.slice(0, 6).map((item) => ({
      label: this.toAscii(item.label) || "Metric",
      value: this.toAscii(item.value) || "0"
    }));
    const digestLines = this.wrapText(payload.digest, 88).slice(0, 12);
    const highlights = (payload.highlights ?? [])
      .map((line) => this.toAscii(line))
      .filter((line) => line.length > 0)
      .slice(0, 4);
    const recommendations = (payload.recommendations ?? [])
      .map((line) => this.toAscii(line))
      .filter((line) => line.length > 0)
      .slice(0, 5);
    const nextActions = (
      payload.nextActions ?? [
        "Review priorities with the team.",
        "Retest the most strategic content formats.",
        "Compare deltas against previous cycle."
      ]
    )
      .map((line) => this.toAscii(line))
      .filter((line) => line.length > 0)
      .slice(0, 4);

    return this.buildStyledFallbackPdf({
      title: safeTitle,
      periodLabel: safePeriod,
      generatedAt: safeGeneratedAt,
      kpis,
      digestLines,
      highlights,
      recommendations,
      nextActions
    });
  }

  private buildStyledFallbackPdf(payload: {
    title: string;
    periodLabel: string;
    generatedAt: string;
    kpis: Array<{ label: string; value: string }>;
    digestLines: string[];
    highlights: string[];
    recommendations: string[];
    nextActions: string[];
  }): Buffer {
    const pageWidth = 595;
    const pageHeight = 842;
    const shellX = 30;
    const shellY = 28;
    const shellWidth = pageWidth - shellX * 2;
    const shellHeight = pageHeight - shellY * 2;
    const headerHeight = 78;
    const gridTopY = 635;
    const cardGap = 12;
    const cardWidth = (shellWidth - cardGap - 40) / 2;
    const cardHeight = 84;
    const digestBoxY = 204;
    const digestBoxHeight = 182;

    const firstPageCommands: string[] = [];

    // Page background.
    firstPageCommands.push("0.965 0.975 0.99 rg");
    firstPageCommands.push(`0 0 ${pageWidth} ${pageHeight} re`);
    firstPageCommands.push("f");

    // Main report shell.
    firstPageCommands.push("1 1 1 rg");
    firstPageCommands.push(`${shellX} ${shellY} ${shellWidth} ${shellHeight} re`);
    firstPageCommands.push("f");
    firstPageCommands.push("0.85 0.89 0.95 RG");
    firstPageCommands.push("1 w");
    firstPageCommands.push(`${shellX} ${shellY} ${shellWidth} ${shellHeight} re`);
    firstPageCommands.push("S");

    // Header bar.
    firstPageCommands.push("0.70 0.36 0.05 rg");
    firstPageCommands.push(`${shellX} ${shellY + shellHeight - headerHeight} ${shellWidth} ${headerHeight} re`);
    firstPageCommands.push("f");
    firstPageCommands.push("0.96 0.77 0.27 rg");
    firstPageCommands.push(`${shellX} ${shellY + shellHeight - headerHeight} ${shellWidth} 6 re`);
    firstPageCommands.push("f");

    firstPageCommands.push(this.pdfText(payload.title, 48, 757, "F1", 24, [1, 1, 1]));
    firstPageCommands.push(this.pdfText("Pulse Executive Report", 48, 736, "F2", 11, [0.98, 0.92, 0.84]));
    firstPageCommands.push(this.pdfText(`Period: ${payload.periodLabel}`, 48, 700, "F2", 10, [0.27, 0.33, 0.44]));
    firstPageCommands.push(this.pdfText(`Generated at: ${payload.generatedAt}`, 48, 684, "F2", 10, [0.27, 0.33, 0.44]));

    firstPageCommands.push(this.pdfText("Key Metrics", 48, 657, "F1", 13, [0.08, 0.12, 0.22]));

    payload.kpis.forEach((kpi, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const cardX = 48 + col * (cardWidth + cardGap);
      const cardY = gridTopY - row * (cardHeight + cardGap);

      firstPageCommands.push("0.97 0.98 1 rg");
      firstPageCommands.push(`${cardX} ${cardY} ${cardWidth} ${cardHeight} re`);
      firstPageCommands.push("f");
      firstPageCommands.push("0.89 0.92 0.96 RG");
      firstPageCommands.push("1 w");
      firstPageCommands.push(`${cardX} ${cardY} ${cardWidth} ${cardHeight} re`);
      firstPageCommands.push("S");

      firstPageCommands.push(this.pdfText(kpi.label.toUpperCase(), cardX + 12, cardY + cardHeight - 22, "F2", 9, [0.43, 0.49, 0.60]));
      firstPageCommands.push(this.pdfText(kpi.value, cardX + 12, cardY + 24, "F1", 18, [0.08, 0.12, 0.22]));
    });

    firstPageCommands.push(this.pdfText("AI Digest", 48, 412, "F1", 13, [0.08, 0.12, 0.22]));
    firstPageCommands.push("0.985 0.988 0.995 rg");
    firstPageCommands.push(`48 ${digestBoxY} ${shellWidth - 36} ${digestBoxHeight} re`);
    firstPageCommands.push("f");
    firstPageCommands.push("0.90 0.92 0.96 RG");
    firstPageCommands.push("1 w");
    firstPageCommands.push(`48 ${digestBoxY} ${shellWidth - 36} ${digestBoxHeight} re`);
    firstPageCommands.push("S");

    const startY = digestBoxY + digestBoxHeight - 28;
    payload.digestLines.forEach((line, index) => {
      firstPageCommands.push(this.pdfText(line, 62, startY - index * 14, "F2", 10.5, [0.16, 0.20, 0.28]));
    });

    firstPageCommands.push("0.92 0.93 0.97 RG");
    firstPageCommands.push("1 w");
    firstPageCommands.push("48 164 m");
    firstPageCommands.push(`${48 + (shellWidth - 36)} 164 l`);
    firstPageCommands.push("S");
    firstPageCommands.push(this.pdfText("Pulse Analytics - Confidential demo report", 48, 148, "F2", 9, [0.43, 0.49, 0.60]));

    const secondPageCommands: string[] = [];
    secondPageCommands.push("0.965 0.975 0.99 rg");
    secondPageCommands.push(`0 0 ${pageWidth} ${pageHeight} re`);
    secondPageCommands.push("f");
    secondPageCommands.push("1 1 1 rg");
    secondPageCommands.push(`${shellX} ${shellY} ${shellWidth} ${shellHeight} re`);
    secondPageCommands.push("f");
    secondPageCommands.push("0.85 0.89 0.95 RG");
    secondPageCommands.push("1 w");
    secondPageCommands.push(`${shellX} ${shellY} ${shellWidth} ${shellHeight} re`);
    secondPageCommands.push("S");

    secondPageCommands.push("0.10 0.17 0.31 rg");
    secondPageCommands.push(`${shellX} ${shellY + shellHeight - headerHeight} ${shellWidth} ${headerHeight} re`);
    secondPageCommands.push("f");
    secondPageCommands.push("0.34 0.45 0.78 rg");
    secondPageCommands.push(`${shellX} ${shellY + shellHeight - headerHeight} ${shellWidth} 6 re`);
    secondPageCommands.push("f");
    secondPageCommands.push(this.pdfText("Insights & Action Plan", 48, 753, "F1", 23, [1, 1, 1]));
    secondPageCommands.push(this.pdfText(`Reference period: ${payload.periodLabel}`, 48, 732, "F2", 10, [0.84, 0.89, 0.97]));

    secondPageCommands.push(this.pdfText("Highlights", 48, 690, "F1", 13, [0.08, 0.12, 0.22]));
    secondPageCommands.push("0.97 0.98 1 rg");
    secondPageCommands.push("48 520 499 155 re");
    secondPageCommands.push("f");
    secondPageCommands.push("0.89 0.92 0.96 RG");
    secondPageCommands.push("1 w");
    secondPageCommands.push("48 520 499 155 re");
    secondPageCommands.push("S");

    let highlightY = 650;
    (payload.highlights.length > 0 ? payload.highlights : ["No major highlight detected for this cycle."]).forEach((item) => {
      const wrapped = this.wrapText(item, 78).slice(0, 2);
      wrapped.forEach((line, index) => {
        secondPageCommands.push(
          this.pdfText(index === 0 ? `- ${line}` : `  ${line}`, 62, highlightY, "F2", 10.5, [0.16, 0.20, 0.28])
        );
        highlightY -= 14;
      });
      highlightY -= 6;
    });

    secondPageCommands.push(this.pdfText("Recommendations", 48, 485, "F1", 13, [0.08, 0.12, 0.22]));
    secondPageCommands.push("0.97 0.98 1 rg");
    secondPageCommands.push("48 316 499 154 re");
    secondPageCommands.push("f");
    secondPageCommands.push("0.89 0.92 0.96 RG");
    secondPageCommands.push("1 w");
    secondPageCommands.push("48 316 499 154 re");
    secondPageCommands.push("S");

    let recommendationY = 447;
    (payload.recommendations.length > 0
      ? payload.recommendations
      : ["Keep current pace and monitor key KPIs weekly."]).forEach((item, index) => {
      const wrapped = this.wrapText(item, 76).slice(0, 2);
      wrapped.forEach((line, lineIndex) => {
        const prefix = lineIndex === 0 ? `${index + 1}. ` : "   ";
        secondPageCommands.push(
          this.pdfText(`${prefix}${line}`, 62, recommendationY, "F2", 10.5, [0.16, 0.20, 0.28])
        );
        recommendationY -= 14;
      });
      recommendationY -= 6;
    });

    secondPageCommands.push(this.pdfText("Next cycle checklist", 48, 282, "F1", 13, [0.08, 0.12, 0.22]));
    secondPageCommands.push("0.97 0.98 1 rg");
    secondPageCommands.push("48 146 499 124 re");
    secondPageCommands.push("f");
    secondPageCommands.push("0.89 0.92 0.96 RG");
    secondPageCommands.push("1 w");
    secondPageCommands.push("48 146 499 124 re");
    secondPageCommands.push("S");

    let checklistY = 246;
    payload.nextActions.forEach((item) => {
      const wrapped = this.wrapText(item, 78).slice(0, 2);
      wrapped.forEach((line, index) => {
        secondPageCommands.push(
          this.pdfText(index === 0 ? `[ ] ${line}` : `    ${line}`, 62, checklistY, "F2", 10.5, [0.16, 0.20, 0.28])
        );
        checklistY -= 14;
      });
      checklistY -= 6;
    });

    secondPageCommands.push(this.pdfText("Pulse Analytics - Decision-ready output", 48, 126, "F2", 9, [0.43, 0.49, 0.60]));

    return this.buildPdfDocument([firstPageCommands.join("\n"), secondPageCommands.join("\n")]);
  }

  private buildPdfDocument(pageStreams: string[]): Buffer {
    const pageCount = Math.max(1, pageStreams.length);
    const fontBoldObjectId = 3 + pageCount * 2;
    const fontRegularObjectId = fontBoldObjectId + 1;
    const kids = Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(" ");

    const objects: string[] = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

    pageStreams.forEach((stream, index) => {
      const pageObjectId = 3 + index * 2;
      const contentObjectId = pageObjectId + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontBoldObjectId} 0 R /F2 ${fontRegularObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
      );
      objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    });

    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

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

  private pdfText(
    text: string,
    x: number,
    y: number,
    font: "F1" | "F2",
    size: number,
    color: [number, number, number]
  ): string {
    const safeText = this.escapePdfText(this.toAscii(text));
    if (!safeText) {
      return "";
    }

    return [
      `${color[0]} ${color[1]} ${color[2]} rg`,
      "BT",
      `/${font} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
      `(${safeText}) Tj`,
      "ET"
    ].join("\n");
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

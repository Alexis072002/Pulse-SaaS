import { Injectable } from "@nestjs/common";

export interface ReportPdfPayload {
  title: string;
  periodLabel: string;
  generatedAt: string;
  kpis: Array<{ label: string; value: string }>;
  digest: string;
}

@Injectable()
export class PdfService {
  async render(payload: ReportPdfPayload): Promise<Buffer> {
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

  private toAscii(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }
}

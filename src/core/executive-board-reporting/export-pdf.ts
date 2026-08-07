import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BoardPackExportArtifact } from "./export-types";
import { getFrozenBoardPackExportData } from "./export-data";
import {
  jsonArray,
  jsonObject,
  safeFileName,
  stringValue,
} from "./export-utils";

function wrap(text: string, max = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export async function generateBoardPackPdf(input: {
  tenantId: string;
  boardPackId: string;
}): Promise<BoardPackExportArtifact> {
  const pack = await getFrozenBoardPackExportData(input);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let y = 742;

  const addLine = (
    text: string,
    options?: { size?: number; bold?: boolean; gap?: number },
  ) => {
    const size = options?.size ?? 10;
    const font = options?.bold ? bold : regular;
    const gap = options?.gap ?? size + 4;

    for (const line of wrap(text, size >= 18 ? 54 : 88)) {
      if (y < 60) {
        page = pdf.addPage([612, 792]);
        y = 742;
      }
      page.drawText(line, {
        x: 50,
        y,
        size,
        font,
        color: rgb(0.08, 0.1, 0.16),
      });
      y -= gap;
    }
  };

  addLine(pack.title, { size: 20, bold: true, gap: 25 });
  addLine(`${pack.packNumber} · ${pack.packType} · ${pack.periodType}`, {
    size: 10,
  });
  addLine(
    `${pack.periodStart.toLocaleDateString()} – ${pack.periodEnd.toLocaleDateString()}`,
    { size: 10 },
  );
  y -= 12;

  addLine("Executive Summary", { size: 15, bold: true, gap: 20 });
  addLine(pack.executiveSummary || "No executive summary available.");
  y -= 10;

  const sections = jsonObject(pack.sectionSnapshot);
  const risks = jsonArray(sections.risks);
  const opportunities = jsonArray(sections.opportunities);
  const decisions = jsonArray(sections.decisions);

  addLine("Top Risks", { size: 15, bold: true, gap: 20 });
  if (risks.length === 0) addLine("No risks recorded.");
  risks.slice(0, 10).forEach((item, index) => {
    const row = jsonObject(item);
    addLine(
      `${index + 1}. ${stringValue(row.title, "Untitled risk")} — ${stringValue(row.severity, "UNKNOWN")}`,
      { bold: true },
    );
    addLine(stringValue(row.summary, ""));
  });
  y -= 10;

  addLine("Top Opportunities", { size: 15, bold: true, gap: 20 });
  if (opportunities.length === 0) addLine("No opportunities recorded.");
  opportunities.slice(0, 10).forEach((item, index) => {
    const row = jsonObject(item);
    addLine(`${index + 1}. ${stringValue(row.title, "Untitled opportunity")}`, {
      bold: true,
    });
    addLine(stringValue(row.summary, ""));
  });
  y -= 10;

  addLine("Priority Decisions", { size: 15, bold: true, gap: 20 });
  if (decisions.length === 0) addLine("No priority decisions recorded.");
  decisions.slice(0, 12).forEach((item, index) => {
    const row = jsonObject(item);
    addLine(`${index + 1}. ${stringValue(row.title, "Untitled decision")}`, {
      bold: true,
    });
    addLine(stringValue(row.recommendation, ""));
  });

  y -= 12;
  addLine("Governance & Provenance", { size: 15, bold: true, gap: 20 });
  addLine(`Source fingerprint: ${pack.sourceFingerprint}`);
  addLine(`Pack status: ${pack.status}`);
  addLine(
    `Finalized: ${pack.finalizedAt?.toLocaleString() ?? "Not finalized"}`,
  );

  const bytes = await pdf.save();

  return {
    buffer: Buffer.from(bytes),
    fileName: `${safeFileName(pack.packNumber)}-${safeFileName(pack.packType)}.pdf`,
    contentType: "application/pdf",
  };
}

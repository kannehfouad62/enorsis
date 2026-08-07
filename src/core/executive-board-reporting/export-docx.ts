import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { BoardPackExportArtifact } from "./export-types";
import { getFrozenBoardPackExportData } from "./export-data";
import {
  jsonArray,
  jsonObject,
  safeFileName,
  stringValue,
} from "./export-utils";

export async function generateBoardPackDocx(input: {
  tenantId: string;
  boardPackId: string;
}): Promise<BoardPackExportArtifact> {
  const pack = await getFrozenBoardPackExportData(input);
  const sections = jsonObject(pack.sectionSnapshot);
  const risks = jsonArray(sections.risks);
  const opportunities = jsonArray(sections.opportunities);
  const decisions = jsonArray(sections.decisions);

  const children: Paragraph[] = [
    new Paragraph({
      text: pack.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${pack.packNumber} · ${pack.packType} · ${pack.periodType}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      text: `${pack.periodStart.toLocaleDateString()} – ${pack.periodEnd.toLocaleDateString()}`,
    }),
    new Paragraph({
      text: "Executive Summary",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph(pack.executiveSummary || "No executive summary available."),
    new Paragraph({
      text: "Top Risks",
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  risks.slice(0, 10).forEach((item) => {
    const row = jsonObject(item);
    children.push(
      new Paragraph({
        text: `${stringValue(row.title, "Untitled risk")} — ${stringValue(row.severity, "UNKNOWN")}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(stringValue(row.summary, "")),
    );
  });

  children.push(
    new Paragraph({
      text: "Top Opportunities",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  opportunities.slice(0, 10).forEach((item) => {
    const row = jsonObject(item);
    children.push(
      new Paragraph({
        text: stringValue(row.title, "Untitled opportunity"),
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(stringValue(row.summary, "")),
    );
  });

  children.push(
    new Paragraph({
      text: "Priority Decisions",
      heading: HeadingLevel.HEADING_1,
    }),
  );

  decisions.slice(0, 12).forEach((item) => {
    const row = jsonObject(item);
    children.push(
      new Paragraph({
        text: stringValue(row.title, "Untitled decision"),
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(stringValue(row.recommendation, "")),
    );
  });

  children.push(
    new Paragraph({
      text: "Governance & Provenance",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph(`Source fingerprint: ${pack.sourceFingerprint}`),
    new Paragraph(`Pack status: ${pack.status}`),
  );

  const document = new Document({
    sections: [{ children }],
  });

  return {
    buffer: await Packer.toBuffer(document),
    fileName: `${safeFileName(pack.packNumber)}-${safeFileName(pack.packType)}.docx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

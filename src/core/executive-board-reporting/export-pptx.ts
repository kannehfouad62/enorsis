import pptxgen from "pptxgenjs";
import type { BoardPackExportArtifact } from "./export-types";
import { getFrozenBoardPackExportData } from "./export-data";
import {
  jsonArray,
  jsonObject,
  safeFileName,
  stringValue,
} from "./export-utils";

export async function generateBoardPackPptx(input: {
  tenantId: string;
  boardPackId: string;
}): Promise<BoardPackExportArtifact> {
  const pack = await getFrozenBoardPackExportData(input);
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Enorsis";
  pptx.subject = "Executive Board Pack";
  pptx.title = pack.title;
  pptx.company = "Enorsis";

  const title = pptx.addSlide();
  title.addText(pack.title, {
    x: 0.7,
    y: 1.4,
    w: 11.8,
    h: 0.8,
    fontSize: 26,
    bold: true,
  });
  title.addText(
    `${pack.packNumber} · ${pack.packType} · ${pack.periodType}\n${pack.periodStart.toLocaleDateString()} – ${pack.periodEnd.toLocaleDateString()}`,
    {
      x: 0.7,
      y: 2.5,
      w: 11.8,
      h: 0.8,
      fontSize: 14,
    },
  );

  const summary = pptx.addSlide();
  summary.addText("Executive Summary", {
    x: 0.6,
    y: 0.5,
    w: 12,
    h: 0.5,
    fontSize: 24,
    bold: true,
  });
  summary.addText(pack.executiveSummary || "No executive summary available.", {
    x: 0.7,
    y: 1.3,
    w: 11.8,
    h: 4.6,
    fontSize: 16,
    breakLine: false,
    valign: "top",
  });
  summary.addText(`Source fingerprint: ${pack.sourceFingerprint}`, {
    x: 0.7,
    y: 6.6,
    w: 11.8,
    h: 0.3,
    fontSize: 8,
  });

  const sections = jsonObject(pack.sectionSnapshot);

  const addListSlide = (
    heading: string,
    items: unknown[],
    colorLabel: string,
  ) => {
    const slide = pptx.addSlide();
    slide.addText(heading, {
      x: 0.6,
      y: 0.4,
      w: 12,
      h: 0.5,
      fontSize: 24,
      bold: true,
    });

    const lines = items.slice(0, 7).map((item, index) => {
      const row = jsonObject(item);
      return {
        text: `${index + 1}. ${stringValue(row.title, "Untitled")} — ${stringValue(
          row.summary,
          stringValue(row.recommendation),
        )}`,
        options: { bullet: false, breakLine: true },
      };
    });

    if (lines.length === 0) {
      lines.push({
        text: "No items recorded.",
        options: { bullet: false, breakLine: true },
      });
    }

    slide.addText(lines, {
      x: 0.8,
      y: 1.2,
      w: 11.5,
      h: 5.6,
      fontSize: 14,
      valign: "top",
    });

    slide.addText(colorLabel, {
      x: 10.5,
      y: 0.4,
      w: 1.5,
      h: 0.35,
      fontSize: 9,
      bold: true,
    });
  };

  addListSlide("Top Risks", jsonArray(sections.risks), "RISK");
  addListSlide("Top Opportunities", jsonArray(sections.opportunities), "OPPORTUNITY");
  addListSlide("Priority Decisions", jsonArray(sections.decisions), "DECISION");

  const governance = pptx.addSlide();
  governance.addText("Governance & Provenance", {
    x: 0.6,
    y: 0.5,
    w: 12,
    h: 0.5,
    fontSize: 24,
    bold: true,
  });
  governance.addText(
    `Pack status: ${pack.status}\nFinalized: ${
      pack.finalizedAt?.toLocaleString() ?? "Not finalized"
    }\nSource fingerprint: ${pack.sourceFingerprint}\n\nGovernance Snapshot:\n${JSON.stringify(
      pack.governanceSnapshot,
      null,
      2,
    )}`,
    {
      x: 0.7,
      y: 1.2,
      w: 11.8,
      h: 5.8,
      fontSize: 11,
      valign: "top",
    },
  );

  const output = await pptx.write({ outputType: "nodebuffer" });

  return {
    buffer: Buffer.from(output as Buffer),
    fileName: `${safeFileName(pack.packNumber)}-${safeFileName(pack.packType)}.pptx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

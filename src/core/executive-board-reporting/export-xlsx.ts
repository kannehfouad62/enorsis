import ExcelJS from "exceljs";
import type { BoardPackExportArtifact } from "./export-types";
import { getFrozenBoardPackExportData } from "./export-data";
import {
  jsonArray,
  jsonObject,
  numberValue,
  safeFileName,
  stringValue,
} from "./export-utils";

export async function generateBoardPackXlsx(input: {
  tenantId: string;
  boardPackId: string;
}): Promise<BoardPackExportArtifact> {
  const pack = await getFrozenBoardPackExportData(input);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Enorsis";
  workbook.subject = "Executive Board Pack";
  workbook.title = pack.title;

  const summary = workbook.addWorksheet("Executive Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 90 },
  ];
  summary.addRows([
    { field: "Pack", value: pack.packNumber },
    { field: "Title", value: pack.title },
    { field: "Type", value: pack.packType },
    { field: "Status", value: pack.status },
    { field: "Period", value: `${pack.periodStart.toISOString()} – ${pack.periodEnd.toISOString()}` },
    { field: "Executive Summary", value: pack.executiveSummary },
    { field: "Source Fingerprint", value: pack.sourceFingerprint },
  ]);
  summary.getRow(1).font = { bold: true };

  const source = jsonObject(pack.sourceSnapshot);
  const kpis = jsonArray(source.kpis);
  const kpiSheet = workbook.addWorksheet("KPI Scorecard");
  kpiSheet.columns = [
    { header: "Metric", key: "name", width: 36 },
    { header: "Key", key: "key", width: 44 },
    { header: "Domain", key: "domain", width: 18 },
    { header: "Current", key: "current", width: 16 },
    { header: "Previous", key: "previous", width: 16 },
    { header: "Target", key: "target", width: 16 },
    { header: "Health", key: "health", width: 16 },
    { header: "Trend", key: "trend", width: 16 },
  ];

  kpis.forEach((item) => {
    const row = jsonObject(item);
    kpiSheet.addRow({
      name: stringValue(row.name),
      key: stringValue(row.metricKey),
      domain: stringValue(row.domain),
      current: numberValue(row.currentValue),
      previous:
        row.previousValue === null || row.previousValue === undefined
          ? null
          : numberValue(row.previousValue),
      target:
        row.targetValue === null || row.targetValue === undefined
          ? null
          : numberValue(row.targetValue),
      health: stringValue(row.healthStatus),
      trend: stringValue(row.trendDirection),
    });
  });
  kpiSheet.getRow(1).font = { bold: true };

  const sections = jsonObject(pack.sectionSnapshot);
  const risks = workbook.addWorksheet("Risks");
  risks.columns = [
    { header: "Title", key: "title", width: 42 },
    { header: "Severity", key: "severity", width: 16 },
    { header: "Domain", key: "domain", width: 22 },
    { header: "Summary", key: "summary", width: 80 },
    { header: "Recommendation", key: "recommendation", width: 80 },
  ];
  jsonArray(sections.risks).forEach((item) => {
    const row = jsonObject(item);
    risks.addRow({
      title: stringValue(row.title),
      severity: stringValue(row.severity),
      domain: stringValue(row.domain),
      summary: stringValue(row.summary),
      recommendation: stringValue(row.recommendation),
    });
  });
  risks.getRow(1).font = { bold: true };

  const opportunities = workbook.addWorksheet("Opportunities");
  opportunities.columns = [
    { header: "Title", key: "title", width: 42 },
    { header: "Domain", key: "domain", width: 22 },
    { header: "Summary", key: "summary", width: 80 },
    { header: "Recommendation", key: "recommendation", width: 80 },
  ];
  jsonArray(sections.opportunities).forEach((item) => {
    const row = jsonObject(item);
    opportunities.addRow({
      title: stringValue(row.title),
      domain: stringValue(row.domain),
      summary: stringValue(row.summary),
      recommendation: stringValue(row.recommendation),
    });
  });
  opportunities.getRow(1).font = { bold: true };

  const governance = workbook.addWorksheet("Governance");
  governance.columns = [
    { header: "Snapshot", key: "snapshot", width: 120 },
  ];
  governance.addRow({
    snapshot: JSON.stringify(pack.governanceSnapshot),
  });
  governance.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    fileName: `${safeFileName(pack.packNumber)}-${safeFileName(pack.packType)}.xlsx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

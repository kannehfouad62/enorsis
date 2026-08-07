export type BoardPackExportFormat = "PDF" | "DOCX" | "XLSX" | "PPTX";

export type BoardPackExportArtifact = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

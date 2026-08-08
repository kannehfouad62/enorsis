import { getPrivateContractDocument } from "@/modules/contracts/documents";
import { getPrivateSupplierDocument } from "@/modules/suppliers/documents";

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    length += value.length;
  }

  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(result);
}

async function extractPdf(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default;
  const result = await pdfParse(buffer);
  return result.text.trim();
}

async function extractDocx(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractPrivateDocumentText(input: {
  kind: "SUPPLIER" | "CONTRACT";
  pathname: string;
  filename: string;
}) {
  const result =
    input.kind === "SUPPLIER"
      ? await getPrivateSupplierDocument(input.pathname)
      : await getPrivateContractDocument(input.pathname);

  if (!result) {
    throw new Error("Private document blob could not be found.");
  }

  const contentType =
    result.blob.contentType?.toLowerCase() ?? "";
  const filename = input.filename.toLowerCase();

  if (!result.stream) {
    throw new Error("Private document blob stream is unavailable.");
  }

  const buffer = await streamToBuffer(result.stream);

  if (
    contentType === "application/pdf" ||
    filename.endsWith(".pdf")
  ) {
    const text = await extractPdf(buffer);
    if (!text) {
      throw new Error(
        "The PDF did not contain extractable text. Scanned PDFs require OCR.",
      );
    }

    return {
      text,
      contentType: "application/pdf",
      extractionMethod: "pdf-parse",
      bytes: buffer.length,
    };
  }

  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    const text = await extractDocx(buffer);
    if (!text) {
      throw new Error(
        "The DOCX document did not contain extractable text.",
      );
    }

    return {
      text,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extractionMethod: "mammoth",
      bytes: buffer.length,
    };
  }

  throw new Error(
    `Automatic RAG extraction does not support ${contentType || input.filename}. ` +
      "PDF and DOCX are supported in B4.3; scanned images require OCR.",
  );
}

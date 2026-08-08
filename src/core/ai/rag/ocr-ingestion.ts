import {
  indexEnterpriseKnowledgeSource,
  knowledgeContentHash,
} from "@/core/ai/rag/knowledge-index";
import { extractTextWithGovernedOcr } from "@/core/ai/rag/ocr";
import { prisma } from "@/lib/prisma";
import { getPrivateContractDocument } from "@/modules/contracts/documents";
import { getPrivateSupplierDocument } from "@/modules/suppliers/documents";

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    size += value.length;
  }

  const merged = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(merged);
}

async function readPrivateBlob(
  kind: "SUPPLIER" | "CONTRACT",
  pathname: string,
) {
  const result =
    kind === "SUPPLIER"
      ? await getPrivateSupplierDocument(pathname)
      : await getPrivateContractDocument(pathname);

  if (!result?.stream) {
    throw new Error("Private document blob is unavailable.");
  }

  return {
    buffer: await streamToBuffer(result.stream),
    contentType:
      result.blob.contentType ?? "application/octet-stream",
  };
}

async function upsertAndIndex(input: {
  tenantId: string;
  userId: string;
  sourceType: "SUPPLIER_DOCUMENT" | "CONTRACT_DOCUMENT";
  title: string;
  description: string;
  externalReference: string;
  metadata: Record<string, string | number | boolean | null>;
  text: string;
}) {
  const existing =
    await prisma.enterpriseKnowledgeSource.findFirst({
      where: {
        tenantId: input.tenantId,
        externalReference: input.externalReference,
      },
    });

  const source = existing
    ? await prisma.enterpriseKnowledgeSource.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description,
          sourceType: input.sourceType,
          status: "INDEXING",
          contentHash: knowledgeContentHash(input.text),
          metadata: input.metadata,
        },
      })
    : await prisma.enterpriseKnowledgeSource.create({
        data: {
          tenantId: input.tenantId,
          sourceType: input.sourceType,
          title: input.title,
          description: input.description,
          externalReference: input.externalReference,
          status: "INDEXING",
          contentHash: knowledgeContentHash(input.text),
          metadata: input.metadata,
          createdByUserId: input.userId,
        },
      });

  const chunkCount = await indexEnterpriseKnowledgeSource({
    sourceId: source.id,
    tenantId: input.tenantId,
    content: input.text,
  });

  return { source, chunkCount };
}

export async function ocrSupplierDocument(input: {
  tenantId: string;
  userId: string;
  documentId: string;
}) {
  const document = await prisma.supplierDocument.findFirst({
    where: {
      id: input.documentId,
      supplier: { tenantId: input.tenantId },
    },
    include: {
      supplier: {
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
        },
      },
    },
  });

  if (!document?.blobPathname) {
    throw new Error("Supplier document was not found.");
  }

  const blob = await readPrivateBlob(
    "SUPPLIER",
    document.blobPathname,
  );

  const extracted = await extractTextWithGovernedOcr({
    filename: document.name,
    contentType: blob.contentType,
    buffer: blob.buffer,
  });

  const result = await upsertAndIndex({
    tenantId: input.tenantId,
    userId: input.userId,
    sourceType: "SUPPLIER_DOCUMENT",
    title: document.name,
    description:
      `OCR supplier document for ${
        document.supplier.tradingName ||
        document.supplier.legalName
      } (${document.supplier.supplierNumber})`,
    externalReference: `supplier-document:${document.id}`,
    text: extracted.text,
    metadata: {
      documentId: document.id,
      supplierId: document.supplier.id,
      supplierNumber: document.supplier.supplierNumber,
      blobPathname: document.blobPathname,
      contentType: blob.contentType,
      extractionMethod: extracted.method,
      ocrModel: extracted.model,
      bytes: blob.buffer.length,
    },
  });

  return { ...result, extracted };
}

export async function ocrContractDocument(input: {
  tenantId: string;
  userId: string;
  documentId: string;
}) {
  const document = await prisma.contractDocument.findFirst({
    where: {
      id: input.documentId,
      contract: { tenantId: input.tenantId },
    },
    include: {
      contract: {
        select: {
          id: true,
          contractNumber: true,
          title: true,
        },
      },
    },
  });

  if (!document?.blobPathname) {
    throw new Error("Contract document was not found.");
  }

  const blob = await readPrivateBlob(
    "CONTRACT",
    document.blobPathname,
  );

  const extracted = await extractTextWithGovernedOcr({
    filename: document.name,
    contentType: blob.contentType,
    buffer: blob.buffer,
  });

  const result = await upsertAndIndex({
    tenantId: input.tenantId,
    userId: input.userId,
    sourceType: "CONTRACT_DOCUMENT",
    title: document.name,
    description:
      `OCR contract document for ${document.contract.title} ` +
      `(${document.contract.contractNumber})`,
    externalReference: `contract-document:${document.id}`,
    text: extracted.text,
    metadata: {
      documentId: document.id,
      contractId: document.contract.id,
      contractNumber: document.contract.contractNumber,
      blobPathname: document.blobPathname,
      contentType: blob.contentType,
      extractionMethod: extracted.method,
      ocrModel: extracted.model,
      bytes: blob.buffer.length,
    },
  });

  return { ...result, extracted };
}

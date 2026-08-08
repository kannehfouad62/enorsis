import {
  indexEnterpriseKnowledgeSource,
  knowledgeContentHash,
} from "@/core/ai/rag/knowledge-index";
import { prisma } from "@/lib/prisma";
import { extractPrivateDocumentText } from "./document-extractor";

export async function ingestSupplierDocument(input: {
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

  const extracted = await extractPrivateDocumentText({
    kind: "SUPPLIER",
    pathname: document.blobPathname,
    filename: document.name,
  });

  const externalReference =
    `supplier-document:${document.id}`;

  const existing =
    await prisma.enterpriseKnowledgeSource.findFirst({
      where: {
        tenantId: input.tenantId,
        externalReference,
      },
    });

  const source = existing
    ? await prisma.enterpriseKnowledgeSource.update({
        where: { id: existing.id },
        data: {
          title: document.name,
          description:
            `Supplier document for ${
              document.supplier.tradingName ||
              document.supplier.legalName
            } (${document.supplier.supplierNumber})`,
          sourceType: "SUPPLIER_DOCUMENT",
          status: "INDEXING",
          contentHash: knowledgeContentHash(extracted.text),
          metadata: {
            documentId: document.id,
            supplierId: document.supplier.id,
            supplierNumber: document.supplier.supplierNumber,
            blobPathname: document.blobPathname,
            contentType: extracted.contentType,
            extractionMethod: extracted.extractionMethod,
            bytes: extracted.bytes,
          },
        },
      })
    : await prisma.enterpriseKnowledgeSource.create({
        data: {
          tenantId: input.tenantId,
          sourceType: "SUPPLIER_DOCUMENT",
          title: document.name,
          description:
            `Supplier document for ${
              document.supplier.tradingName ||
              document.supplier.legalName
            } (${document.supplier.supplierNumber})`,
          externalReference,
          status: "INDEXING",
          contentHash: knowledgeContentHash(extracted.text),
          metadata: {
            documentId: document.id,
            supplierId: document.supplier.id,
            supplierNumber: document.supplier.supplierNumber,
            blobPathname: document.blobPathname,
            contentType: extracted.contentType,
            extractionMethod: extracted.extractionMethod,
            bytes: extracted.bytes,
          },
          createdByUserId: input.userId,
        },
      });

  const chunkCount = await indexEnterpriseKnowledgeSource({
    sourceId: source.id,
    tenantId: input.tenantId,
    content: extracted.text,
  });

  return { source, chunkCount, extracted };
}

export async function ingestContractDocument(input: {
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

  const extracted = await extractPrivateDocumentText({
    kind: "CONTRACT",
    pathname: document.blobPathname,
    filename: document.name,
  });

  const externalReference =
    `contract-document:${document.id}`;

  const existing =
    await prisma.enterpriseKnowledgeSource.findFirst({
      where: {
        tenantId: input.tenantId,
        externalReference,
      },
    });

  const source = existing
    ? await prisma.enterpriseKnowledgeSource.update({
        where: { id: existing.id },
        data: {
          title: document.name,
          description:
            `Contract document for ${document.contract.title} ` +
            `(${document.contract.contractNumber})`,
          sourceType: "CONTRACT_DOCUMENT",
          status: "INDEXING",
          contentHash: knowledgeContentHash(extracted.text),
          metadata: {
            documentId: document.id,
            contractId: document.contract.id,
            contractNumber: document.contract.contractNumber,
            blobPathname: document.blobPathname,
            contentType: extracted.contentType,
            extractionMethod: extracted.extractionMethod,
            bytes: extracted.bytes,
          },
        },
      })
    : await prisma.enterpriseKnowledgeSource.create({
        data: {
          tenantId: input.tenantId,
          sourceType: "CONTRACT_DOCUMENT",
          title: document.name,
          description:
            `Contract document for ${document.contract.title} ` +
            `(${document.contract.contractNumber})`,
          externalReference,
          status: "INDEXING",
          contentHash: knowledgeContentHash(extracted.text),
          metadata: {
            documentId: document.id,
            contractId: document.contract.id,
            contractNumber: document.contract.contractNumber,
            blobPathname: document.blobPathname,
            contentType: extracted.contentType,
            extractionMethod: extracted.extractionMethod,
            bytes: extracted.bytes,
          },
          createdByUserId: input.userId,
        },
      });

  const chunkCount = await indexEnterpriseKnowledgeSource({
    sourceId: source.id,
    tenantId: input.tenantId,
    content: extracted.text,
  });

  return { source, chunkCount, extracted };
}

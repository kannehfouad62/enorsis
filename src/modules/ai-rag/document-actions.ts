"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  ingestContractDocument,
  ingestSupplierDocument,
} from "@/core/ai/rag/document-ingestion";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function writeAudit(input: {
  tenantId: string;
  userId: string;
  email?: string | null;
  action: string;
  resourceId: string;
  documentId: string;
  chunkCount: number;
  extractionMethod: string;
}) {
  await prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      actorType: "USER",
      actorId: input.userId,
      actorLabel: input.email ?? "RAG document administrator",
      action: input.action,
      resourceType: "EnterpriseKnowledgeSource",
      resourceId: input.resourceId,
      after: {
        documentId: input.documentId,
        chunkCount: input.chunkCount,
        extractionMethod: input.extractionMethod,
      },
    },
  });
}

export async function ingestSupplierDocumentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const documentId = field(data, "documentId");

  const result = await ingestSupplierDocument({
    tenantId: user.tenantId,
    userId: user.id,
    documentId,
  });

  await writeAudit({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    action: "rag_document.supplier.index",
    resourceId: result.source.id,
    documentId,
    chunkCount: result.chunkCount,
    extractionMethod: result.extracted.extractionMethod,
  });

  revalidatePath("/app/ai/knowledge/documents");
  revalidatePath("/app/ai/knowledge");
}

export async function ingestContractDocumentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const documentId = field(data, "documentId");

  const result = await ingestContractDocument({
    tenantId: user.tenantId,
    userId: user.id,
    documentId,
  });

  await writeAudit({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    action: "rag_document.contract.index",
    resourceId: result.source.id,
    documentId,
    chunkCount: result.chunkCount,
    extractionMethod: result.extracted.extractionMethod,
  });

  revalidatePath("/app/ai/knowledge/documents");
  revalidatePath("/app/ai/knowledge");
}

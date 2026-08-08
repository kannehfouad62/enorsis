"use server";

import { revalidatePath } from "next/cache";
import {
  ocrContractDocument,
  ocrSupplierDocument,
} from "@/core/ai/rag/ocr-ingestion";
import { requireAnyRole } from "@/core/auth/authorization";
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

async function audit(input: {
  tenantId: string;
  userId: string;
  email?: string | null;
  action: string;
  resourceId: string;
  documentId: string;
  chunkCount: number;
  model: string;
}) {
  await prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      actorType: "USER",
      actorId: input.userId,
      actorLabel: input.email ?? "OCR administrator",
      action: input.action,
      resourceType: "EnterpriseKnowledgeSource",
      resourceId: input.resourceId,
      after: {
        documentId: input.documentId,
        chunkCount: input.chunkCount,
        ocrModel: input.model,
        extractionMethod: "openai-vision-ocr",
      },
    },
  });
}

export async function ocrSupplierDocumentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const documentId = field(data, "documentId");

  const result = await ocrSupplierDocument({
    tenantId: user.tenantId,
    userId: user.id,
    documentId,
  });

  await audit({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    action: "rag_document.supplier.ocr",
    resourceId: result.source.id,
    documentId,
    chunkCount: result.chunkCount,
    model: result.extracted.model,
  });

  revalidatePath("/app/ai/knowledge/ocr");
  revalidatePath("/app/ai/knowledge/documents");
  revalidatePath("/app/ai/knowledge");
}

export async function ocrContractDocumentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const documentId = field(data, "documentId");

  const result = await ocrContractDocument({
    tenantId: user.tenantId,
    userId: user.id,
    documentId,
  });

  await audit({
    tenantId: user.tenantId,
    userId: user.id,
    email: user.email,
    action: "rag_document.contract.ocr",
    resourceId: result.source.id,
    documentId,
    chunkCount: result.chunkCount,
    model: result.extracted.model,
  });

  revalidatePath("/app/ai/knowledge/ocr");
  revalidatePath("/app/ai/knowledge/documents");
  revalidatePath("/app/ai/knowledge");
}

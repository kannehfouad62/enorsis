"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  addClauseSchema,
  addObligationSchema,
  createContractSchema,
} from "./schemas";
import { uploadPrivateContractDocument } from "./documents";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function createContractAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = createContractSchema.parse({
    supplierId: value(formData, "supplierId"),
    sourcingEventId: value(formData, "sourcingEventId") || undefined,
    title: value(formData, "title"),
    type: value(formData, "type"),
    currencyCode: value(formData, "currencyCode"),
    totalValue: value(formData, "totalValue") || undefined,
    startDate: value(formData, "startDate"),
    endDate: value(formData, "endDate"),
    autoRenew: formData.get("autoRenew") === "on",
    renewalNoticeDays: value(formData, "renewalNoticeDays") || "90",
    governingLaw: value(formData, "governingLaw"),
    summary: value(formData, "summary"),
  });

  const count = await prisma.contract.count({
    where: { tenantId: user.tenantId },
  });

  const contract = await prisma.contract.create({
    data: {
      tenantId: user.tenantId,
      supplierId: input.supplierId,
      sourcingEventId: input.sourcingEventId || null,
      contractNumber: `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: input.title,
      type: input.type,
      status: "DRAFT",
      currencyCode: input.currencyCode,
      totalValue: input.totalValue,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      autoRenew: input.autoRenew ?? false,
      renewalNoticeDays: input.renewalNoticeDays,
      governingLaw: input.governingLaw || null,
      ownerUserId: user.id,
      summary: input.summary || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "contract.create",
      resourceType: "Contract",
      resourceId: contract.id,
      after: {
        contractNumber: contract.contractNumber,
        supplierId: input.supplierId,
        totalValue: input.totalValue,
      },
    },
  });

  revalidatePath("/app/contracts");
}

export async function createContractFromAwardAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const sourcingEventId = value(formData, "sourcingEventId");
  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: {
      id: sourcingEventId,
      tenantId: user.tenantId,
      status: "AWARDED",
      awardedSupplierId: { not: null },
    },
    include: { award: true },
  });

  if (!event.awardedSupplierId) {
    throw new Error("The sourcing event has no awarded supplier.");
  }

  const existing = await prisma.contract.findFirst({
    where: { tenantId: user.tenantId, sourcingEventId: event.id },
  });

  if (existing) {
    throw new Error("A contract already exists for this sourcing award.");
  }

  const count = await prisma.contract.count({
    where: { tenantId: user.tenantId },
  });

  const contract = await prisma.contract.create({
    data: {
      tenantId: user.tenantId,
      supplierId: event.awardedSupplierId,
      sourcingEventId: event.id,
      contractNumber: `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: `${event.title} Agreement`,
      type: "PURCHASE_AGREEMENT",
      status: "DRAFT",
      currencyCode: event.currencyCode,
      totalValue: event.estimatedValue,
      ownerUserId: user.id,
      summary: event.awardRecommendation,
    },
  });

  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function addContractClauseAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = addClauseSchema.parse({
    contractId: value(formData, "contractId"),
    name: value(formData, "name"),
    category: value(formData, "category"),
    body: value(formData, "body"),
    riskLevel: value(formData, "riskLevel"),
  });

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: input.contractId, tenantId: user.tenantId },
    include: { clauses: true },
  });

  await prisma.contractClause.create({
    data: {
      contractId: contract.id,
      name: input.name,
      category: input.category,
      body: input.body,
      riskLevel: input.riskLevel,
      sequence: contract.clauses.length + 1,
      negotiated: true,
    },
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function addContractObligationAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = addObligationSchema.parse({
    contractId: value(formData, "contractId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    ownerUserId: value(formData, "ownerUserId"),
    dueDate: value(formData, "dueDate"),
    recurring: formData.get("recurring") === "on",
    recurrenceRule: value(formData, "recurrenceRule"),
  });

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: input.contractId, tenantId: user.tenantId },
  });

  await prisma.contractObligation.create({
    data: {
      contractId: contract.id,
      title: input.title,
      description: input.description || null,
      ownerUserId: input.ownerUserId || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      recurring: input.recurring ?? false,
      recurrenceRule: input.recurrenceRule || null,
    },
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function uploadContractDocumentAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const type = value(formData, "type");

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("A contract document is required.");
  }

  const blob = await uploadPrivateContractDocument(
    user.tenantId,
    contract.id,
    file,
  );

  await prisma.contractDocument.create({
    data: {
      contractId: contract.id,
      type: type as "DRAFT" | "EXECUTED" | "AMENDMENT" | "EXHIBIT" | "SUPPORTING",
      name: file.name,
      blobPathname: blob.pathname,
      storageUrl: blob.url,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedByUserId: user.id,
    },
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}

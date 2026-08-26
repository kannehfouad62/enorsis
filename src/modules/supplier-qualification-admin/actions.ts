"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function requireSupplier(tenantId: string, supplierId: string) {
  return prisma.supplier.findFirstOrThrow({
    where: {
      id: supplierId,
      tenantId,
    },
    select: {
      id: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
    },
  });
}

function revalidateQualification() {
  revalidatePath("/app/suppliers");
  revalidatePath("/app/suppliers/qualification");
}

export async function createBuyerSupplierQuestionnaireAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  const supplier = await requireSupplier(user.tenantId, supplierId);

  const title = field(data, "title");
  const questionLines = field(data, "questions")
    .split("\n")
    .map((question) => question.trim())
    .filter(Boolean);

  if (!title || questionLines.length === 0) {
    throw new Error("Questionnaire title and at least one question are required.");
  }

  const questionnaire = await prisma.supplierOnboardingQuestionnaire.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title,
      description: field(data, "description") || null,
      questions: questionLines.map((question, index) => ({
        key: `question_${index + 1}`,
        label: question,
        required: true,
        type: "text",
      })),
      status: "SENT",
      dueAt: field(data, "dueAt") ? new Date(field(data, "dueAt")) : null,
      sentAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier qualification administrator",
      action: "supplier_qualification.questionnaire.issue",
      resourceType: "SupplierOnboardingQuestionnaire",
      resourceId: questionnaire.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        title: questionnaire.title,
        status: questionnaire.status,
        dueAt: questionnaire.dueAt,
      },
    },
  });

  revalidateQualification();
}

export async function createBuyerSupplierQualificationTaskAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  const supplier = await requireSupplier(user.tenantId, supplierId);
  const title = field(data, "title");

  if (!title) {
    throw new Error("Qualification task title is required.");
  }

  const task = await prisma.supplierPortalTask.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title,
      description: field(data, "description") || null,
      dueAt: field(data, "dueAt") ? new Date(field(data, "dueAt")) : null,
      buyerOwnerUserId: user.id,
      supplierOwnerEmail: field(data, "supplierOwnerEmail") || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier qualification administrator",
      action: "supplier_qualification.task.assign",
      resourceType: "SupplierPortalTask",
      resourceId: task.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt,
        supplierOwnerEmail: task.supplierOwnerEmail,
      },
    },
  });

  revalidateQualification();
}

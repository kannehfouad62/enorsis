"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function inviteSupplierPortalUserAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");
  const email = field(data, "email").toLowerCase();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  await prisma.$transaction([
    prisma.supplierPortalInvitation.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        email,
        contactName: field(data, "contactName") || null,
        tokenHash,
        invitedByUserId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.supplierPortalUser.upsert({
      where: {
        tenantId_supplierId_email: {
          tenantId: user.tenantId,
          supplierId,
          email,
        },
      },
      update: {
        name: field(data, "contactName") || undefined,
        jobTitle: field(data, "jobTitle") || undefined,
        phone: field(data, "phone") || undefined,
        status: "INVITED",
        invitedAt: new Date(),
      },
      create: {
        tenantId: user.tenantId,
        supplierId,
        email,
        name: field(data, "contactName") || null,
        jobTitle: field(data, "jobTitle") || null,
        phone: field(data, "phone") || null,
      },
    }),
  ]);

  revalidatePath("/app/supplier-portal");
}

export async function createOnboardingQuestionnaireAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");

  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  const questions = field(data, "questions")
    .split("\n")
    .map((question) => question.trim())
    .filter(Boolean)
    .map((question, index) => ({
      key: `question_${index + 1}`,
      label: question,
      required: true,
      type: "text",
    }));

  await prisma.supplierOnboardingQuestionnaire.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title: field(data, "title"),
      description: field(data, "description") || null,
      questions,
      status: "SENT",
      dueAt: field(data, "dueAt") ? new Date(field(data, "dueAt")) : null,
      sentAt: new Date(),
    },
  });

  revalidatePath("/app/supplier-portal");
}

export async function createSupplierPortalTaskAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");

  await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId: user.tenantId },
  });

  await prisma.supplierPortalTask.create({
    data: {
      tenantId: user.tenantId,
      supplierId,
      title: field(data, "title"),
      description: field(data, "description") || null,
      dueAt: field(data, "dueAt") ? new Date(field(data, "dueAt")) : null,
      buyerOwnerUserId: user.id,
      supplierOwnerEmail: field(data, "supplierOwnerEmail") || null,
    },
  });

  revalidatePath("/app/supplier-portal");
}

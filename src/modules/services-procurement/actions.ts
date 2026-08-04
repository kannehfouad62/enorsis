"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createStatementOfWorkAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const count = await prisma.statementOfWork.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.statementOfWork.create({
    data: {
      tenantId: user.tenantId,
      supplierId: field(formData, "supplierId"),
      sowNumber: `SOW-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: field(formData, "title"),
      description: field(formData, "description"),
      engagementType: field(formData, "engagementType") as
        | "FIXED_FEE"
        | "TIME_AND_MATERIALS"
        | "RETAINER"
        | "MILESTONE_BASED"
        | "CONTINGENT_LABOR",
      currencyCode: field(formData, "currencyCode") || "USD",
      notToExceedAmount: Number(field(formData, "notToExceedAmount")),
      startsAt: new Date(field(formData, "startsAt")),
      endsAt: new Date(field(formData, "endsAt")),
      businessOwnerUserId: field(formData, "businessOwnerUserId") || user.id,
      procurementOwnerUserId: user.id,
      scopeOfWork: field(formData, "scopeOfWork"),
      deliverables: field(formData, "deliverables"),
      acceptanceCriteria: field(formData, "acceptanceCriteria"),
    },
  });

  revalidatePath("/app/services");
}

export async function addServiceMilestoneAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const statementOfWorkId = field(formData, "statementOfWorkId");

  await prisma.statementOfWork.findFirstOrThrow({
    where: { id: statementOfWorkId, tenantId: user.tenantId },
  });

  await prisma.serviceMilestone.create({
    data: {
      statementOfWorkId,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      dueAt: new Date(field(formData, "dueAt")),
      amount: Number(field(formData, "amount")),
    },
  });

  revalidatePath("/app/services");
}

export async function addServiceWorkerAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const statementOfWorkId = field(formData, "statementOfWorkId");

  await prisma.statementOfWork.findFirstOrThrow({
    where: { id: statementOfWorkId, tenantId: user.tenantId },
  });

  await prisma.serviceWorker.create({
    data: {
      tenantId: user.tenantId,
      statementOfWorkId,
      workerReference: field(formData, "workerReference"),
      fullName: field(formData, "fullName"),
      email: field(formData, "email") || null,
      roleTitle: field(formData, "roleTitle"),
      status: "ACTIVE",
      startsAt: new Date(field(formData, "startsAt")),
      endsAt: field(formData, "endsAt")
        ? new Date(field(formData, "endsAt"))
        : null,
      hourlyRate: field(formData, "hourlyRate")
        ? Number(field(formData, "hourlyRate"))
        : null,
      dailyRate: field(formData, "dailyRate")
        ? Number(field(formData, "dailyRate"))
        : null,
      maximumHours: field(formData, "maximumHours")
        ? Number(field(formData, "maximumHours"))
        : null,
      managerUserId: field(formData, "managerUserId") || user.id,
    },
  });

  revalidatePath("/app/services");
}

export async function submitServiceTimeAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const serviceWorkerId = field(formData, "serviceWorkerId");

  const worker = await prisma.serviceWorker.findFirstOrThrow({
    where: { id: serviceWorkerId, tenantId: user.tenantId },
  });

  const hours = Number(field(formData, "hours"));
  const rate = Number(worker.hourlyRate ?? 0);

  await prisma.serviceTimeEntry.create({
    data: {
      tenantId: user.tenantId,
      statementOfWorkId: worker.statementOfWorkId,
      serviceWorkerId: worker.id,
      workDate: new Date(field(formData, "workDate")),
      hours,
      rate,
      amount: hours * rate,
      description: field(formData, "description"),
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/app/services");
}

export async function approveServiceTimeAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const timeEntryId = field(formData, "timeEntryId");
  const entry = await prisma.serviceTimeEntry.findFirstOrThrow({
    where: {
      id: timeEntryId,
      tenantId: user.tenantId,
      status: "SUBMITTED",
    },
  });

  await prisma.serviceTimeEntry.update({
    where: { id: entry.id },
    data: {
      status: "APPROVED",
      approvedByUserId: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/app/services");
}

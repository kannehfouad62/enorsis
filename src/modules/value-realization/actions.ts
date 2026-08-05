"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createValueInitiativeAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const count = await prisma.procurementValueInitiative.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.procurementValueInitiative.create({
    data: {
      tenantId: user.tenantId,
      initiativeNumber: `VAL-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      title: field(data, "title"),
      description: field(data, "description"),
      category: field(data, "category") || null,
      supplierId: field(data, "supplierId") || null,
      sourcingEventId: field(data, "sourcingEventId") || null,
      contractId: field(data, "contractId") || null,
      ownerUserId: user.id,
      financeOwnerUserId: field(data, "financeOwnerUserId") || null,
      executiveSponsorUserId:
        field(data, "executiveSponsorUserId") || null,
      currencyCode: field(data, "currencyCode") || "USD",
      baselineAmount: Number(field(data, "baselineAmount") || 0),
      targetBenefitAmount: Number(
        field(data, "targetBenefitAmount") || 0,
      ),
      forecastBenefitAmount: Number(
        field(data, "forecastBenefitAmount") || 0,
      ),
      probabilityPercent: Number(
        field(data, "probabilityPercent") || 50,
      ),
      startsAt: new Date(field(data, "startsAt")),
      targetCompletionAt: new Date(
        field(data, "targetCompletionAt"),
      ),
      assumptions: field(data, "assumptions") || null,
      risks: field(data, "risks") || null,
      status: "QUALIFYING",
    },
  });

  revalidatePath("/app/value-realization");
}

export async function addProcurementBenefitAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const initiativeId = field(data, "initiativeId");

  await prisma.procurementValueInitiative.findFirstOrThrow({
    where: { id: initiativeId, tenantId: user.tenantId },
  });

  await prisma.procurementBenefit.create({
    data: {
      procurementValueInitiativeId: initiativeId,
      type: field(data, "type") as
        | "COST_REDUCTION"
        | "COST_AVOIDANCE"
        | "WORKING_CAPITAL"
        | "REVENUE_ENABLEMENT"
        | "RISK_REDUCTION"
        | "PRODUCTIVITY"
        | "SUSTAINABILITY"
        | "OTHER",
      name: field(data, "name"),
      description: field(data, "description") || null,
      frequency: field(data, "frequency") as
        | "ONE_TIME"
        | "MONTHLY"
        | "QUARTERLY"
        | "ANNUAL",
      periodStart: new Date(field(data, "periodStart")),
      periodEnd: field(data, "periodEnd")
        ? new Date(field(data, "periodEnd"))
        : null,
      forecastAmount: Number(field(data, "forecastAmount") || 0),
      claimedAmount: Number(field(data, "claimedAmount") || 0),
      methodology: field(data, "methodology"),
      evidenceUrl: field(data, "evidenceUrl") || null,
      validationStatus: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/app/value-realization");
}

export async function validateProcurementBenefitAction(data: FormData) {
  const user = await requireAnyRole([
    "FINANCE",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const benefitId = field(data, "benefitId");
  const benefit = await prisma.procurementBenefit.findFirstOrThrow({
    where: {
      id: benefitId,
      initiative: { tenantId: user.tenantId },
      validationStatus: "SUBMITTED",
    },
  });

  const validatedAmount = Number(
    field(data, "validatedAmount") || benefit.claimedAmount,
  );
  const realizedAmount = Number(
    field(data, "realizedAmount") || validatedAmount,
  );

  await prisma.$transaction(async (tx) => {
    await tx.procurementBenefit.update({
      where: { id: benefit.id },
      data: {
        validationStatus: "FINANCE_VALIDATED",
        validatedAmount,
        realizedAmount,
        validatedByUserId: user.id,
        validatedAt: new Date(),
      },
    });

    const benefits = await tx.procurementBenefit.findMany({
      where: {
        procurementValueInitiativeId:
          benefit.procurementValueInitiativeId,
      },
      select: {
        forecastAmount: true,
        realizedAmount: true,
      },
    });

    const forecast = benefits.reduce(
      (sum, item) => sum + Number(item.forecastAmount),
      0,
    );
    const realized = benefits.reduce(
      (sum, item) => sum + Number(item.realizedAmount),
      0,
    );

    await tx.procurementValueInitiative.update({
      where: { id: benefit.procurementValueInitiativeId },
      data: {
        status: realized > 0 ? "REALIZING" : "IN_PROGRESS",
        forecastBenefitAmount: forecast,
        realizedBenefitAmount: realized,
        leakageAmount: Math.max(0, forecast - realized),
      },
    });
  });

  revalidatePath("/app/value-realization");
}

export async function addValueMilestoneAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const initiativeId = field(data, "initiativeId");

  await prisma.procurementValueInitiative.findFirstOrThrow({
    where: { id: initiativeId, tenantId: user.tenantId },
  });

  await prisma.procurementValueMilestone.create({
    data: {
      procurementValueInitiativeId: initiativeId,
      name: field(data, "name"),
      description: field(data, "description") || null,
      dueAt: new Date(field(data, "dueAt")),
      ownerUserId: field(data, "ownerUserId") || user.id,
    },
  });

  revalidatePath("/app/value-realization");
}

export async function updateValueMilestoneAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const milestoneId = field(data, "milestoneId");

  const milestone =
    await prisma.procurementValueMilestone.findFirstOrThrow({
      where: {
        id: milestoneId,
        initiative: { tenantId: user.tenantId },
      },
    });

  const status = field(data, "status") as
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "BLOCKED"
    | "CANCELLED";

  await prisma.procurementValueMilestone.update({
    where: { id: milestone.id },
    data: {
      status,
      blocker: field(data, "blocker") || null,
      completionEvidence:
        field(data, "completionEvidence") || null,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/app/value-realization");
}

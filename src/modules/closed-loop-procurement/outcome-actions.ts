"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  discoverClosedLoopOutcomes,
  observeClosedLoopMetric,
  validateClosedLoopOutcome,
} from "@/core/closed-loop-procurement/outcomes";

const observeRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const validateRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function discoverClosedLoopOutcomesAction() {
  await requireAnyRole([...validateRoles]);
  await discoverClosedLoopOutcomes();
  revalidatePath("/app/analytics/outcome-learning");
}

export async function observeClosedLoopMetricAction(
  data: FormData,
) {
  const user = await requireAnyRole([...observeRoles]);

  const actualValue = Number(
    field(data, "actualValue"),
  );

  if (!Number.isFinite(actualValue)) {
    throw new Error(
      "A valid actual value is required.",
    );
  }

  await observeClosedLoopMetric({
    tenantId: user.tenantId,
    userId: user.id,
    metricId: field(data, "metricId"),
    actualValue,
    evidenceNote:
      field(data, "evidenceNote") || null,
  });

  revalidatePath("/app/analytics/outcome-learning");
}

export async function validateClosedLoopOutcomeAction(
  data: FormData,
) {
  const user = await requireAnyRole([...validateRoles]);

  await validateClosedLoopOutcome({
    tenantId: user.tenantId,
    userId: user.id,
    outcomeId: field(data, "outcomeId"),
    quality: field(data, "quality"),
    note: field(data, "note") || null,
  });

  revalidatePath("/app/analytics/outcome-learning");
}

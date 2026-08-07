"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  refreshEnterpriseKpis,
  updateEnterpriseKpiGovernance,
} from "@/core/enterprise-analytics/kpi-engine";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const nullableNumber = (data: FormData, key: string) => {
  const value = field(data, key);
  return value ? Number(value) : null;
};

export async function refreshEnterpriseKpisAction() {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await refreshEnterpriseKpis({
    tenantId: user.tenantId,
    actorUserId: user.id,
  });

  revalidatePath("/app/executive/kpis");
  revalidatePath("/app/executive/analytics-foundation");
}

export async function updateEnterpriseKpiGovernanceAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
  ]);

  await updateEnterpriseKpiGovernance({
    tenantId: user.tenantId,
    metricDefinitionId: field(data, "metricDefinitionId"),
    targetValue: nullableNumber(data, "targetValue"),
    warningThreshold: nullableNumber(data, "warningThreshold"),
    criticalThreshold: nullableNumber(data, "criticalThreshold"),
    higherIsBetter: field(data, "higherIsBetter") === "true",
    calculationVersion: field(data, "calculationVersion") || null,
  });

  revalidatePath("/app/executive/kpis");
}

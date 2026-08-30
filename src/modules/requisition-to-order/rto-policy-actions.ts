"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { RTO_SLA_POLICY } from "./rto-sla-policy";

const allowedRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

const DEFAULTS: Record<string, number> = {
  "rto.pendingApproval.warningHours":
    RTO_SLA_POLICY.pendingApprovalWarningHours,
  "rto.pendingApproval.breachHours":
    RTO_SLA_POLICY.pendingApprovalBreachHours,
  "rto.exception.critical.warningHours":
    RTO_SLA_POLICY.criticalExceptionWarningHours,
  "rto.exception.critical.breachHours":
    RTO_SLA_POLICY.criticalExceptionBreachHours,
  "rto.exception.high.warningHours":
    RTO_SLA_POLICY.highExceptionWarningHours,
  "rto.exception.high.breachHours":
    RTO_SLA_POLICY.highExceptionBreachHours,
  "rto.exception.medium.warningHours":
    RTO_SLA_POLICY.mediumExceptionWarningHours,
  "rto.exception.medium.breachHours":
    RTO_SLA_POLICY.mediumExceptionBreachHours,
  "rto.exception.low.warningHours":
    RTO_SLA_POLICY.lowExceptionWarningHours,
  "rto.exception.low.breachHours":
    RTO_SLA_POLICY.lowExceptionBreachHours,
};

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function initializeRtoPolicyCatalogAction() {
  await requireAnyRole([...allowedRoles]);

  for (const [key, value] of Object.entries(DEFAULTS)) {
    await prisma.enterprisePolicyDefinition.upsert({
      where: { key },
      create: {
        key,
        name: key
          .replaceAll("rto.", "")
          .replaceAll(".", " "),
        description:
          "Governed requisition-to-order SLA threshold.",
        category: "PROCUREMENT_CONTROL",
        moduleKey: "requisition-to-order",
        valueType: "NUMBER",
        defaultValue: toJson({ value }),
        status: "ACTIVE",
        managedByPlatform: true,
      },
      update: {
        defaultValue: toJson({ value }),
        status: "ACTIVE",
        managedByPlatform: true,
      },
    });
  }

  revalidatePath(
    "/app/requisition-to-order/assurance/policies",
  );
}

export async function setRtoTenantPolicyOverrideAction(
  data: FormData,
) {
  const user = await requireAnyRole([...allowedRoles]);

  const definitionId = field(
    data,
    "definitionId",
  );
  const numericValue = Number(
    field(data, "value"),
  );

  if (
    !definitionId ||
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    throw new Error(
      "A valid non-negative policy value is required.",
    );
  }

  const definition =
    await prisma.enterprisePolicyDefinition.findFirstOrThrow({
      where: {
        id: definitionId,
        moduleKey: "requisition-to-order",
      },
      select: { id: true },
    });

  await prisma.enterpriseTenantPolicy.upsert({
    where: {
      tenantId_policyDefinitionId: {
        tenantId: user.tenantId,
        policyDefinitionId: definition.id,
      },
    },
    create: {
      tenantId: user.tenantId,
      policyDefinitionId: definition.id,
      value: toJson({ value: numericValue }),
      active: true,
    },
    update: {
      value: toJson({ value: numericValue }),
      active: true,
    },
  });

  revalidatePath(
    "/app/requisition-to-order/assurance/policies",
  );
}

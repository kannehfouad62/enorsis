import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RTO_SLA_POLICY } from "./rto-sla-policy";

const POLICY_KEYS = [
  "rto.pendingApproval.warningHours",
  "rto.pendingApproval.breachHours",
  "rto.exception.critical.warningHours",
  "rto.exception.critical.breachHours",
  "rto.exception.high.warningHours",
  "rto.exception.high.breachHours",
  "rto.exception.medium.warningHours",
  "rto.exception.medium.breachHours",
  "rto.exception.low.warningHours",
  "rto.exception.low.breachHours",
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

function jsonNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const record = value as Record<string, unknown>;
    if (
      typeof record.value === "number" &&
      Number.isFinite(record.value)
    ) {
      return record.value;
    }
  }

  return null;
}

export async function getRtoPolicyGovernance() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const definitions =
    await prisma.enterprisePolicyDefinition.findMany({
      where: {
        key: { in: [...POLICY_KEYS] },
      },
      include: {
        tenantOverrides: {
          where: { tenantId },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { key: "asc" },
    });

  const byKey = new Map(
    definitions.map((item) => [item.key, item]),
  );

  const policies = POLICY_KEYS.map((key) => {
    const definition = byKey.get(key) ?? null;
    const override =
      definition?.tenantOverrides[0] ?? null;

    const defaultValue =
      definition
        ? jsonNumber(definition.defaultValue) ??
          DEFAULTS[key]
        : DEFAULTS[key];

    const overrideValue =
      override
        ? jsonNumber(override.value)
        : null;

    return {
      key,
      definitionId: definition?.id ?? null,
      definitionStatus:
        definition?.status ?? "NOT_INITIALIZED",
      defaultValue,
      overrideValue,
      effectiveValue:
        overrideValue ?? defaultValue,
      source:
        overrideValue !== null
          ? "TENANT_OVERRIDE"
          : definition
            ? "PLATFORM_DEFAULT"
            : "CODE_DEFAULT",
    };
  });

  return {
    policies,
    summary: {
      total: policies.length,
      initialized: policies.filter(
        (item) => item.definitionId,
      ).length,
      tenantOverrides: policies.filter(
        (item) =>
          item.source === "TENANT_OVERRIDE",
      ).length,
      codeDefaults: policies.filter(
        (item) =>
          item.source === "CODE_DEFAULT",
      ).length,
    },
  };
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveRuntimeLearningPolicySnapshot } from "@/core/closed-loop-procurement/runtime-policy";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getRuntimeLearningPolicyWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      roles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [activePolicies, snapshot] =
    await Promise.all([
      prisma.closedLoopLearningPolicy.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
        },
        orderBy: [
          { policyKey: "asc" },
          { version: "desc" },
        ],
        take: 200,
      }),
      resolveRuntimeLearningPolicySnapshot({
        tenantId,
        confidence: 75,
        defaultConfidenceThreshold: 70,
      }),
    ]);

  return {
    activePolicies,
    snapshot,
    metrics: {
      activePolicies: activePolicies.length,
      runtimeSupported: activePolicies.filter(
        (item) =>
          item.policyType ===
          "CONFIDENCE_THRESHOLD",
      ).length,
      advisoryOnly: activePolicies.filter(
        (item) =>
          item.policyType !==
          "CONFIDENCE_THRESHOLD",
      ).length,
    },
  };
}

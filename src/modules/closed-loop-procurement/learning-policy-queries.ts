import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

export async function getLearningPolicyWorkspace() {
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

  const [policies, events] = await Promise.all([
    prisma.closedLoopLearningPolicy.findMany({
      where: { tenantId },
      orderBy: [
        { policyKey: "asc" },
        { version: "desc" },
      ],
      take: 300,
    }),
    prisma.closedLoopLearningPolicyEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  return {
    policies,
    events,
    metrics: {
      candidates: policies.filter(
        (item) => item.status === "CANDIDATE",
      ).length,
      active: policies.filter(
        (item) => item.status === "ACTIVE",
      ).length,
      superseded: policies.filter(
        (item) => item.status === "SUPERSEDED",
      ).length,
      rolledBack: policies.filter(
        (item) => item.status === "ROLLED_BACK",
      ).length,
    },
  };
}

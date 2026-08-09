import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensurePredictiveProcurementAdoption } from "@/core/closed-loop-procurement/runtime-adoption";

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

export async function getRuntimePolicyAdoptionWorkspace() {
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

  const adoption =
    await ensurePredictiveProcurementAdoption(
      tenantId,
    );

  const events =
    await prisma.closedLoopRuntimePolicyAdoptionEvent.findMany({
      where: {
        tenantId,
        adoptionId: adoption.id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

  const shadowDifferenceRate =
    adoption.decisionCount === 0
      ? 0
      : (adoption.shadowDifferenceCount /
          adoption.decisionCount) *
        100;

  return {
    adoption,
    events,
    metrics: {
      decisionCount:
        adoption.decisionCount,
      shadowDifferenceCount:
        adoption.shadowDifferenceCount,
      shadowDifferenceRate,
      mode: adoption.mode,
    },
  };
}

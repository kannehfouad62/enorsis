import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateAiRuntimeHealth } from "@/core/ai-monitoring/runtime-health";

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

export async function getAiRuntimeHealthWorkspace() {
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

  const [current, snapshots] =
    await Promise.all([
      calculateAiRuntimeHealth(tenantId),
      prisma.aiRuntimeHealthSnapshot.findMany({
        where: { tenantId },
        orderBy: { capturedAt: "desc" },
        take: 100,
      }),
    ]);

  return {
    current,
    snapshots,
  };
}

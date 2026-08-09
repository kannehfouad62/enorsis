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

export async function getAiRuntimeCertificationWorkspace() {
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

  const runs =
    await prisma.aiRuntimeCertificationRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

  const latest = runs[0] ?? null;

  const results = latest
    ? await prisma.aiRuntimeCertificationResult.findMany({
        where: {
          tenantId,
          certificationRunId: latest.id,
        },
        orderBy: [
          { status: "asc" },
          { category: "asc" },
          { scenarioLabel: "asc" },
        ],
      })
    : [];

  return {
    runs,
    latest,
    results,
  };
}

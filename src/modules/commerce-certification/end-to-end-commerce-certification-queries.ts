import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
]);

export async function getEndToEndCommerceCertificationWorkspace() {
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

  const tenantId =
    session.user.tenantId;

  const runs =
    await prisma.endToEndCommerceCertificationRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

  const latest =
    runs[0] ?? null;

  const checks = latest
    ? await prisma.endToEndCommerceCertificationCheck.findMany({
        where: {
          tenantId,
          certificationRunId:
            latest.id,
        },
        orderBy: [
          { lifecycleStage: "asc" },
          { status: "asc" },
        ],
      })
    : [];

  return {
    runs,
    latest,
    checks,
  };
}

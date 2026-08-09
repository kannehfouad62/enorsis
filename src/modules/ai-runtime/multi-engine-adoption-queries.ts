import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureAllMultiEngineAdoptions,
  getMultiEngineRuntimeCatalog,
} from "@/core/ai-runtime/multi-engine-adoption";

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

export async function getMultiEngineAdoptionWorkspace() {
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

  await ensureAllMultiEngineAdoptions(
    tenantId,
  );

  const catalog =
    getMultiEngineRuntimeCatalog();

  const adoptions =
    await prisma.closedLoopRuntimePolicyAdoption.findMany({
      where: {
        tenantId,
        decisionPath: {
          in: catalog.map(
            (item) =>
              item.decisionPath,
          ),
        },
      },
      orderBy: {
        decisionPath: "asc",
      },
    });

  const events =
    await prisma.closedLoopRuntimePolicyAdoptionEvent.findMany({
      where: {
        tenantId,
        adoptionId: {
          in: adoptions.map(
            (item) => item.id,
          ),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

  return {
    catalog,
    adoptions,
    events,
    metrics: {
      off: adoptions.filter(
        (item) =>
          item.mode === "OFF",
      ).length,
      shadow: adoptions.filter(
        (item) =>
          item.mode === "SHADOW",
      ).length,
      enforced: adoptions.filter(
        (item) =>
          item.mode === "ENFORCED",
      ).length,
      decisions:
        adoptions.reduce(
          (sum, item) =>
            sum +
            item.decisionCount,
          0,
        ),
    },
  };
}

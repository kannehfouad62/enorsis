import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getSupplierMatchingWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [runs, suppliers] = await Promise.all([
    prisma.supplierMarketplaceMatchRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
      },
      take: 1000,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  const latestRun = runs[0] ?? null;

  const latestResults = latestRun
    ? await prisma.supplierMarketplaceMatchResult.findMany({
        where: {
          tenantId,
          matchRunId: latestRun.id,
        },
        orderBy: { rank: "asc" },
        take: 50,
      })
    : [];

  return {
    runs,
    latestRun,
    latestResults: latestResults.map((result) => ({
      ...result,
      supplier:
        supplierMap.get(result.supplierId) ?? null,
    })),
  };
}

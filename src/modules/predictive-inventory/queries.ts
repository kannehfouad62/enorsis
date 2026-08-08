import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set(["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "BUYER", "INVENTORY_MANAGER", "WAREHOUSE_MANAGER", "FINANCE", "AUDITOR", "VIEWER", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"]);

export async function getPredictiveInventoryWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.roles.some((role) => roles.has(role))) redirect("/app/unauthorized");
  const tenantId = session.user.tenantId;
  const runs = await prisma.predictiveInventoryOptimizationRun.findMany({ where: { tenantId }, orderBy: { generatedAt: "desc" }, take: 20 });
  const latestRun = runs[0] ?? null;
  const signals = latestRun ? await prisma.predictiveInventoryOptimizationSignal.findMany({ where: { tenantId, optimizationRunId: latestRun.id }, orderBy: [{ stockoutProbability: "desc" }, { excessValue: "desc" }], take: 500 }) : [];
  return {
    runs,
    latestRun,
    signals,
    metrics: {
      totalItems: signals.length,
      urgentReorders: signals.filter((item) => item.recommendation === "URGENT_REORDER").length,
      reorderCandidates: signals.filter((item) => Number(item.suggestedReorderQty) > 0).length,
      excessItems: signals.filter((item) => Number(item.excessQuantity) > 0).length,
      excessValue: signals.reduce((sum, item) => sum + Number(item.excessValue), 0),
      highStockoutRisk: signals.filter((item) => Number(item.stockoutProbability) >= 65).length,
    },
  };
}

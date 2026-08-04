import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventoryWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId;
  const [locations, items, balances, transactions, counts] = await Promise.all([
    prisma.inventoryLocation.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ where: { tenantId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.inventoryBalance.findMany({ where: { item: { tenantId } }, include: { item: true, location: true }, orderBy: { updatedAt: "desc" } }),
    prisma.inventoryTransaction.findMany({ where: { tenantId }, include: { item: true }, orderBy: { performedAt: "desc" }, take: 100 }),
    prisma.cycleCount.findMany({ where: { tenantId }, include: { location: true, lines: true }, orderBy: { scheduledAt: "desc" }, take: 100 }),
  ]);
  const inventoryValue = balances.reduce((sum, balance) => sum + Number(balance.quantityOnHand) * Number(balance.averageUnitCost ?? balance.item.standardCost ?? 0), 0);
  return {
    locations, items, balances, transactions, counts,
    metrics: {
      activeLocations: locations.filter((item) => item.status === "ACTIVE").length,
      activeItems: items.filter((item) => item.status === "ACTIVE").length,
      inventoryValue,
      lowStockItems: balances.filter((balance) => Number(balance.quantityAvailable) <= Number(balance.item.reorderPoint)).length,
      negativeBalances: balances.filter((balance) => Number(balance.quantityOnHand) < 0).length,
      openCounts: counts.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
    },
  };
}

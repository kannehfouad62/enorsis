import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventoryFinancialValuationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [policies, costLayers, valuations, reconciliations, inboundMovements] =
    await Promise.all([
      prisma.inventoryFinancialValuationPolicy.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.inventoryFinancialCostLayer.findMany({
        where: { tenantId },
        orderBy: { receivedAt: "desc" },
        take: 200,
      }),
      prisma.inventoryFinancialValuationSnapshot.findMany({
        where: { tenantId },
        orderBy: { asOf: "desc" },
        take: 200,
      }),
      prisma.inventoryFinancialReconciliation.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.inventoryMovementLedger.findMany({
        where: {
          tenantId,
          status: "POSTED",
          movementType: {
            in: ["RECEIPT", "ADJUSTMENT_IN", "RETURN"],
          },
        },
        orderBy: { postedAt: "desc" },
        take: 100,
      }),
    ]);

  return {
    policies,
    costLayers,
    valuations,
    reconciliations,
    inboundMovements,
  };
}

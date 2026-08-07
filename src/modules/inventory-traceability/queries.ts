import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventoryTraceabilityWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [units, holds] = await Promise.all([
    prisma.inventoryTraceUnit.findMany({
      where: { tenantId },
      include: {
        events: {
          orderBy: { eventAt: "desc" },
          take: 20,
        },
        holds: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.inventoryTraceHold.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      include: { traceUnit: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { units, holds };
}

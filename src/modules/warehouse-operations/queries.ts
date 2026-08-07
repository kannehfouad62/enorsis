import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getWarehouseOperationsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [sessions, locations, tasks, discrepancies] = await Promise.all([
    prisma.warehouseReceivingSession.findMany({
      where: { tenantId },
      include: {
        lines: true,
        putawayTasks: true,
        discrepancies: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.warehouseLocationControl.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.putawayTask.findMany({
      where: { tenantId },
      include: {
        receiptLine: true,
        destinationControl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.warehouseDiscrepancy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { sessions, locations, tasks, discrepancies };
}

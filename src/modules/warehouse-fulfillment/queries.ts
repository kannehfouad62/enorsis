import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getWarehouseFulfillmentWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [orders, tasks, exceptions] = await Promise.all([
    prisma.warehouseFulfillmentOrder.findMany({
      where: { tenantId },
      include: {
        lines: true,
        pickTasks: true,
        packages: true,
        exceptions: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.warehousePickTask.findMany({
      where: { tenantId },
      include: {
        fulfillmentLine: true,
        fulfillmentOrder: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.warehouseFulfillmentException.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { orders, tasks, exceptions };
}

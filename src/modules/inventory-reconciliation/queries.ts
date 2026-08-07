import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventoryReconciliationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [sessions, reconciliations] = await Promise.all([
    prisma.inventoryCountSession.findMany({
      where: { tenantId },
      include: {
        lines: true,
        reconciliations: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.inventoryReconciliation.findMany({
      where: { tenantId },
      include: {
        countLine: true,
        countSession: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { sessions, reconciliations };
}

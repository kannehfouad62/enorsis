import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPurchaseOrderExecutionWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [journeys, executions] = await Promise.all([
    prisma.requisitionOrderJourney.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["APPROVED", "ORDER_PENDING", "ORDER_ISSUED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrderExecution.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        revisions: { orderBy: { revisionNumber: "desc" } },
        validations: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { journeys, executions };
}

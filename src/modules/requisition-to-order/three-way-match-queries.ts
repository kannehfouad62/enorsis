import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getThreeWayMatchWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [orders, receipts, matchCases] = await Promise.all([
    prisma.purchaseOrderExecution.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["PARTIALLY_RECEIVED", "FULLY_RECEIVED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goodsReceiptSession.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["PARTIALLY_ACCEPTED", "FULLY_ACCEPTED"] },
      },
      include: { purchaseOrderExecution: true },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.threeWayMatchCase.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        purchaseOrderExecution: true,
        goodsReceiptSession: true,
        lines: true,
        exceptions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { orders, receipts, matchCases };
}

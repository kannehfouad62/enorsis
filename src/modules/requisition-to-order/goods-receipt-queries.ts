import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getGoodsReceiptWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [orders, receipts] = await Promise.all([
    prisma.purchaseOrderExecution.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goodsReceiptSession.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        purchaseOrderExecution: true,
        lines: true,
        exceptions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { receivedAt: "desc" },
    }),
  ]);

  return { orders, receipts };
}

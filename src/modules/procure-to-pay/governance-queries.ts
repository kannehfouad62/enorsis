import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPaymentWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [paymentReadyInvoices, batches] = await Promise.all([
    prisma.supplierInvoice.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "PAYMENT_READY",
        matchStatus: { in: ["MATCHED", "OVERRIDDEN"] },
        paymentBatchItems: { none: {} },
      },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
    }),
    prisma.paymentBatch.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { session, paymentReadyInvoices, batches };
}

export async function getPaymentBatchDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const batch = await prisma.paymentBatch.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      items: {
        include: {
          supplierInvoice: {
            include: {
              supplier: true,
              purchaseOrder: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) redirect("/app/purchasing/payments");
  return { session, batch };
}

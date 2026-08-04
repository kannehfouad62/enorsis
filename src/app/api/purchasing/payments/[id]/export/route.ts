import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (
    !session.user.roles.some((role) =>
      ["FINANCE", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
    )
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const batch = await prisma.paymentBatch.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      status: { in: ["APPROVED", "EXPORTED"] },
    },
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
      },
    },
  });

  if (!batch) {
    return new NextResponse("Approved payment batch not found", {
      status: 404,
    });
  }

  const rows = [
    [
      "Batch Number",
      "Invoice Number",
      "Supplier Number",
      "Supplier Name",
      "Purchase Order",
      "Currency",
      "Amount",
      "USD Equivalent",
      "Due Date",
      "Payment Reference",
    ],
    ...batch.items.map((item) => [
      batch.batchNumber,
      item.supplierInvoice.invoiceNumber,
      item.supplierInvoice.supplier.supplierNumber,
      item.supplierInvoice.supplier.tradingName ??
        item.supplierInvoice.supplier.legalName,
      item.supplierInvoice.purchaseOrder?.purchaseOrderNumber ?? "",
      batch.currencyCode,
      item.amount.toString(),
      item.usdEquivalent.toString(),
      item.supplierInvoice.dueDate?.toISOString().slice(0, 10) ?? "",
      item.paymentReference ?? "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\n");

  if (batch.status === "APPROVED") {
    await prisma.$transaction([
      prisma.paymentBatch.update({
        where: { id: batch.id },
        data: {
          status: "EXPORTED",
          exportedByUserId: session.user.id,
          exportedAt: new Date(),
        },
      }),
      prisma.auditEvent.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          actorType: "USER",
          actorId: session.user.id,
          actorLabel: session.user.email,
          action: "payment_batch.export",
          resourceType: "PaymentBatch",
          resourceId: batch.id,
          after: {
            batchNumber: batch.batchNumber,
            format: "CSV",
            invoiceCount: batch.invoiceCount,
          },
        },
      }),
    ]);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="${batch.batchNumber}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

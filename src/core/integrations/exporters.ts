import { prisma } from "@/lib/prisma";

export async function buildIntegrationPayload({
  tenantId,
  resourceType,
  resourceId,
}: {
  tenantId: string;
  resourceType: string;
  resourceId: string;
}) {
  if (resourceType === "PaymentBatch") {
    const batch = await prisma.paymentBatch.findFirstOrThrow({
      where: { id: resourceId, tenantId },
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

    return {
      type: "payment_batch",
      id: batch.id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      currencyCode: batch.currencyCode,
      totalAmount: batch.totalAmount.toString(),
      totalUsdEquivalent: batch.totalUsdEquivalent.toString(),
      paymentDate: batch.paymentDate,
      invoices: batch.items.map((item) => ({
        invoiceId: item.supplierInvoiceId,
        invoiceNumber: item.supplierInvoice.invoiceNumber,
        supplierNumber: item.supplierInvoice.supplier.supplierNumber,
        supplierName:
          item.supplierInvoice.supplier.tradingName ??
          item.supplierInvoice.supplier.legalName,
        purchaseOrderNumber:
          item.supplierInvoice.purchaseOrder?.purchaseOrderNumber ?? null,
        amount: item.amount.toString(),
        usdEquivalent: item.usdEquivalent.toString(),
      })),
    };
  }

  if (resourceType === "PurchaseOrder") {
    const order = await prisma.purchaseOrder.findFirstOrThrow({
      where: { id: resourceId, tenantId },
      include: {
        supplier: true,
        lines: { orderBy: { lineNumber: "asc" } },
      },
    });

    return {
      type: "purchase_order",
      id: order.id,
      purchaseOrderNumber: order.purchaseOrderNumber,
      status: order.status,
      supplierNumber: order.supplier.supplierNumber,
      supplierName: order.supplier.tradingName ?? order.supplier.legalName,
      currencyCode: order.currencyCode,
      totalAmount: order.totalAmount.toString(),
      usdEquivalent: order.usdEquivalent.toString(),
      requestedDeliveryDate: order.requestedDeliveryDate,
      lines: order.lines.map((line) => ({
        lineNumber: line.lineNumber,
        description: line.description,
        category: line.category,
        quantity: line.quantity.toString(),
        unitOfMeasure: line.unitOfMeasure,
        unitPrice: line.unitPrice.toString(),
        lineTotal: line.lineTotal.toString(),
      })),
    };
  }

  if (resourceType === "Supplier") {
    const supplier = await prisma.supplier.findFirstOrThrow({
      where: { id: resourceId, tenantId },
      include: {
        contacts: true,
        documents: true,
      },
    });

    return {
      type: "supplier",
      id: supplier.id,
      supplierNumber: supplier.supplierNumber,
      legalName: supplier.legalName,
      tradingName: supplier.tradingName,
      countryCode: supplier.countryCode,
      taxIdentificationNo: supplier.taxIdentificationNo,
      categories: supplier.categories,
      status: supplier.status,
      riskTier: supplier.riskTier,
      qualificationStatus: supplier.qualificationStatus,
      contacts: supplier.contacts,
      documents: supplier.documents.map((document) => ({
        type: document.type,
        status: document.status,
        name: document.name,
        issuedAt: document.issuedAt,
        expiresAt: document.expiresAt,
      })),
    };
  }

  throw new Error(`Unsupported integration resource type: ${resourceType}`);
}

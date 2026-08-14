"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { evaluateThreeWayMatch } from "./matching";
import {
  advanceClassicProcureToPayAfterReceipt,
} from "@/core/finance-automation/receipt-finance-orchestration";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createPurchaseOrderFromRequestAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const purchaseRequestId = field(formData, "purchaseRequestId");
  const supplierId = field(formData, "supplierId");

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: {
      id: purchaseRequestId,
      tenantId: user.tenantId,
      status: "APPROVED",
    },
    include: { lines: true },
  });

  const supplier = await prisma.supplier.findFirstOrThrow({
    where: {
      id: supplierId,
      tenantId: user.tenantId,
      status: "APPROVED",
    },
  });

  const count = await prisma.purchaseOrder.count({
    where: { tenantId: user.tenantId },
  });
  const purchaseOrderNumber =
    `PO-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const taxAmount = Number(field(formData, "taxAmount") || 0);
  const subtotal = Number(request.totalAmount);
  const totalAmount = subtotal + taxAmount;

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      tenantId: user.tenantId,
      supplierId: supplier.id,
      purchaseRequestId: request.id,
      purchaseOrderNumber,
      status: "DRAFT",
      title: request.title,
      currencyCode: request.originalCurrency,
      subtotal,
      taxAmount,
      totalAmount,
      usdEquivalent:
        totalAmount * Number(request.exchangeRateToUsd),
      exchangeRateToUsd: request.exchangeRateToUsd,
      exchangeRateSource: request.exchangeRateSource,
      exchangeRateDate: request.exchangeRateDate,
      paymentTerms: field(formData, "paymentTerms") || null,
      deliveryAddress: field(formData, "deliveryAddress") || null,
      requestedDeliveryDate: field(formData, "requestedDeliveryDate")
        ? new Date(field(formData, "requestedDeliveryDate"))
        : null,
      buyerUserId: user.id,
      lines: {
        create: request.lines.map((line) => ({
          lineNumber: line.lineNumber,
          description: line.description,
          category: line.category,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
      },
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "purchase_order.create_from_request",
      resourceType: "PurchaseOrder",
      resourceId: purchaseOrder.id,
      after: {
        purchaseOrderNumber,
        purchaseRequestId: request.id,
        supplierId: supplier.id,
        totalAmount,
      },
    },
  });

  revalidatePath("/app/purchasing/orders");
}

export async function issuePurchaseOrderAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const purchaseOrderId = field(formData, "purchaseOrderId");
  const purchaseOrder = await prisma.purchaseOrder.findFirstOrThrow({
    where: { id: purchaseOrderId, tenantId: user.tenantId },
  });

  await prisma.purchaseOrder.update({
    where: { id: purchaseOrder.id },
    data: {
      status: "ISSUED",
      approvedAt: purchaseOrder.approvedAt ?? new Date(),
      issuedAt: new Date(),
    },
  });

  revalidatePath(`/app/purchasing/orders/${purchaseOrder.id}`);
  revalidatePath("/app/purchasing/orders");
}

export async function postReceiptAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const purchaseOrderId = field(formData, "purchaseOrderId");
  const purchaseOrder = await prisma.purchaseOrder.findFirstOrThrow({
    where: {
      id: purchaseOrderId,
      tenantId: user.tenantId,
      status: { in: ["ISSUED", "PARTIALLY_RECEIVED"] },
    },
    include: { lines: true },
  });

  const count = await prisma.procurementReceipt.count({
    where: { tenantId: user.tenantId },
  });

  const quantities = purchaseOrder.lines
    .map((line) => ({
      line,
      quantity: Number(field(formData, `quantity_${line.id}`) || 0),
    }))
    .filter((entry) => entry.quantity > 0);

  if (quantities.length === 0) {
    throw new Error("Enter a received quantity for at least one line.");
  }

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.procurementReceipt.create({
      data: {
        tenantId: user.tenantId,
        purchaseOrderId: purchaseOrder.id,
        receiptNumber:
          `RCV-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
        type: field(formData, "type") === "SERVICE" ? "SERVICE" : "GOODS",
        status: "POSTED",
        receivedByUserId: user.id,
        receivedAt: new Date(field(formData, "receivedAt") || new Date()),
        deliveryReference: field(formData, "deliveryReference") || null,
        notes: field(formData, "notes") || null,
        postedAt: new Date(),
        lines: {
          create: quantities.map(({ line, quantity }) => ({
            purchaseOrderLineId: line.id,
            quantityReceived: quantity,
            quantityAccepted: quantity,
          })),
        },
      },
    });

    for (const { line, quantity } of quantities) {
      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: {
          receivedQuantity: {
            increment: quantity,
          },
        },
      });
    }

    const updatedLines = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: purchaseOrder.id },
    });

    const fullyReceived = updatedLines.every(
      (line) =>
        Number(line.receivedQuantity) >= Number(line.quantity),
    );

    await tx.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
      },
    });

    return created;
  });

  await advanceClassicProcureToPayAfterReceipt({
    purchaseOrderId: purchaseOrder.id,
    actorUserId: user.id,
  });

  revalidatePath(`/app/purchasing/orders/${purchaseOrder.id}`);
  revalidatePath(`/app/purchasing/receipts/${receipt.id}`);
  revalidatePath("/app/purchasing/invoices");
}

export async function submitSupplierInvoiceAction(formData: FormData) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const purchaseOrderId = field(formData, "purchaseOrderId");
  const purchaseOrder = await prisma.purchaseOrder.findFirstOrThrow({
    where: {
      id: purchaseOrderId,
      tenantId: user.tenantId,
      status: {
        in: ["ISSUED", "PARTIALLY_RECEIVED", "RECEIVED"],
      },
    },
    include: { lines: true },
  });

  const invoiceNumber = field(formData, "invoiceNumber");
  const duplicate = await prisma.supplierInvoice.findFirst({
    where: {
      tenantId: user.tenantId,
      supplierId: purchaseOrder.supplierId,
      invoiceNumber,
    },
  });

  if (duplicate) {
    throw new Error("This supplier invoice number already exists.");
  }

  const invoiceLines = purchaseOrder.lines
    .map((line) => {
      const quantity = Number(
        field(formData, `quantity_${line.id}`) || 0,
      );
      const unitPrice = Number(
        field(formData, `unitPrice_${line.id}`) ||
          line.unitPrice,
      );
      return {
        line,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      };
    })
    .filter((entry) => entry.quantity > 0);

  if (invoiceLines.length === 0) {
    throw new Error("Enter an invoice quantity for at least one line.");
  }

  const subtotal = invoiceLines.reduce(
    (sum, line) => sum + line.lineTotal,
    0,
  );
  const taxAmount = Number(field(formData, "taxAmount") || 0);
  const totalAmount = subtotal + taxAmount;

  const invoice = await prisma.supplierInvoice.create({
    data: {
      tenantId: user.tenantId,
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder.id,
      invoiceNumber,
      status: "SUBMITTED",
      matchStatus: "NOT_MATCHED",
      invoiceDate: new Date(field(formData, "invoiceDate")),
      dueDate: field(formData, "dueDate")
        ? new Date(field(formData, "dueDate"))
        : null,
      currencyCode: purchaseOrder.currencyCode,
      subtotal,
      taxAmount,
      totalAmount,
      usdEquivalent:
        totalAmount * Number(purchaseOrder.exchangeRateToUsd),
      exchangeRateToUsd: purchaseOrder.exchangeRateToUsd,
      exchangeRateSource: purchaseOrder.exchangeRateSource,
      exchangeRateDate: purchaseOrder.exchangeRateDate,
      submittedAt: new Date(),
      lines: {
        create: invoiceLines.map(({ line, quantity, unitPrice, lineTotal }, index) => ({
          purchaseOrderLineId: line.id,
          lineNumber: index + 1,
          description: line.description,
          quantity,
          unitPrice,
          lineTotal,
        })),
      },
    },
  });

  revalidatePath(`/app/purchasing/invoices/${invoice.id}`);
  revalidatePath("/app/purchasing/invoices");
}

export async function runThreeWayMatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invoiceId = field(formData, "invoiceId");
  const invoice = await prisma.supplierInvoice.findFirstOrThrow({
    where: { id: invoiceId, tenantId: user.tenantId },
    include: {
      lines: {
        include: {
          purchaseOrderLine: true,
        },
      },
    },
  });

  const result = evaluateThreeWayMatch(
    invoice.lines
      .filter((line) => line.purchaseOrderLine)
      .map((line) => ({
        description: line.description,
        orderedQuantity: Number(line.purchaseOrderLine!.quantity),
        receivedQuantity: Number(
          line.purchaseOrderLine!.receivedQuantity,
        ),
        invoicedQuantity: Number(line.quantity),
        orderedUnitPrice: Number(
          line.purchaseOrderLine!.unitPrice,
        ),
        invoicedUnitPrice: Number(line.unitPrice),
      })),
    {
      quantityPercent: Number(
        field(formData, "quantityTolerance") || 0,
      ),
      pricePercent: Number(
        field(formData, "priceTolerance") || 0,
      ),
    },
  );

  await prisma.$transaction(async (tx) => {
    await tx.invoiceMatchException.deleteMany({
      where: { supplierInvoiceId: invoice.id, status: "OPEN" },
    });

    if (result.exceptions.length > 0) {
      await tx.invoiceMatchException.createMany({
        data: result.exceptions.map((exception) => ({
          supplierInvoiceId: invoice.id,
          type: exception.type,
          severity: exception.severity,
          description: exception.description,
          expectedValue: exception.expectedValue,
          actualValue: exception.actualValue,
          variance: exception.variance,
        })),
      });
    }

    await tx.supplierInvoice.update({
      where: { id: invoice.id },
      data: {
        status: result.matched ? "APPROVED" : "EXCEPTION",
        matchStatus: result.matched ? "MATCHED" : "EXCEPTION",
        approvedAt: result.matched ? new Date() : null,
      },
    });
  });

  revalidatePath(`/app/purchasing/invoices/${invoice.id}`);
  revalidatePath("/app/purchasing/invoices");
}

export async function markInvoicePaymentReadyAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invoiceId = field(formData, "invoiceId");
  const invoice = await prisma.supplierInvoice.findFirstOrThrow({
    where: {
      id: invoiceId,
      tenantId: user.tenantId,
      status: "APPROVED",
      matchStatus: { in: ["MATCHED", "OVERRIDDEN"] },
    },
  });

  await prisma.supplierInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "PAYMENT_READY",
      paymentReadyAt: new Date(),
    },
  });

  revalidatePath(`/app/purchasing/invoices/${invoice.id}`);
  revalidatePath("/app/purchasing/invoices");
}

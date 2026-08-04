"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function resolveInvoiceExceptionAction(formData: FormData) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const exceptionId = field(formData, "exceptionId");
  const resolutionNotes = field(formData, "resolutionNotes");

  if (resolutionNotes.length < 5) {
    throw new Error("Resolution notes must explain the corrective action.");
  }

  const exception = await prisma.invoiceMatchException.findFirstOrThrow({
    where: {
      id: exceptionId,
      supplierInvoice: { tenantId: user.tenantId },
    },
  });

  await prisma.$transaction([
    prisma.invoiceMatchException.update({
      where: { id: exception.id },
      data: {
        status: "RESOLVED",
        resolvedByUserId: user.id,
        resolutionNotes,
        resolvedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "invoice_match_exception.resolve",
        resourceType: "InvoiceMatchException",
        resourceId: exception.id,
        after: { resolutionNotes },
      },
    }),
  ]);

  revalidatePath(`/app/purchasing/invoices/${exception.supplierInvoiceId}`);
}

export async function overrideInvoiceMatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invoiceId = field(formData, "invoiceId");
  const overrideReason = field(formData, "overrideReason");

  if (overrideReason.length < 10) {
    throw new Error("A detailed override reason is required.");
  }

  const invoice = await prisma.supplierInvoice.findFirstOrThrow({
    where: {
      id: invoiceId,
      tenantId: user.tenantId,
      status: "EXCEPTION",
      matchStatus: "EXCEPTION",
    },
    include: {
      exceptions: {
        where: { status: "OPEN" },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.invoiceMatchException.updateMany({
      where: {
        supplierInvoiceId: invoice.id,
        status: "OPEN",
      },
      data: {
        status: "OVERRIDDEN",
        resolvedByUserId: user.id,
        resolutionNotes: overrideReason,
        resolvedAt: new Date(),
      },
    });

    await tx.supplierInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "APPROVED",
        matchStatus: "OVERRIDDEN",
        approvedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "supplier_invoice.match_override",
        resourceType: "SupplierInvoice",
        resourceId: invoice.id,
        before: {
          status: invoice.status,
          matchStatus: invoice.matchStatus,
          openExceptionCount: invoice.exceptions.length,
        },
        after: {
          status: "APPROVED",
          matchStatus: "OVERRIDDEN",
          overrideReason,
        },
      },
    });
  });

  revalidatePath(`/app/purchasing/invoices/${invoice.id}`);
  revalidatePath("/app/purchasing/invoices");
}

export async function createPaymentBatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invoiceIds = formData
    .getAll("invoiceIds")
    .map(String)
    .filter(Boolean);

  if (invoiceIds.length === 0) {
    throw new Error("Select at least one payment-ready invoice.");
  }

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      id: { in: invoiceIds },
      tenantId: user.tenantId,
      status: "PAYMENT_READY",
      matchStatus: { in: ["MATCHED", "OVERRIDDEN"] },
      paymentBatchItems: { none: {} },
    },
    orderBy: { dueDate: "asc" },
  });

  if (invoices.length !== invoiceIds.length) {
    throw new Error(
      "One or more selected invoices are unavailable, already batched, or not payment ready.",
    );
  }

  const currencies = new Set(invoices.map((invoice) => invoice.currencyCode));
  if (currencies.size !== 1) {
    throw new Error("A payment batch may contain only one currency.");
  }

  const count = await prisma.paymentBatch.count({
    where: { tenantId: user.tenantId },
  });
  const batchNumber =
    `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const totalAmount = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.totalAmount),
    0,
  );
  const totalUsdEquivalent = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.usdEquivalent),
    0,
  );

  await prisma.paymentBatch.create({
    data: {
      tenantId: user.tenantId,
      batchNumber,
      status: "DRAFT",
      currencyCode: invoices[0].currencyCode,
      invoiceCount: invoices.length,
      totalAmount,
      totalUsdEquivalent,
      paymentDate: field(formData, "paymentDate")
        ? new Date(field(formData, "paymentDate"))
        : null,
      description: field(formData, "description") || null,
      createdByUserId: user.id,
      items: {
        create: invoices.map((invoice) => ({
          supplierInvoiceId: invoice.id,
          status: "INCLUDED",
          amount: invoice.totalAmount,
          usdEquivalent: invoice.usdEquivalent,
          paymentReference: invoice.paymentReference,
        })),
      },
    },
  });

  revalidatePath("/app/purchasing/payments");
}

export async function submitPaymentBatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const batchId = field(formData, "batchId");
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: {
      id: batchId,
      tenantId: user.tenantId,
      status: "DRAFT",
    },
  });

  await prisma.paymentBatch.update({
    where: { id: batch.id },
    data: {
      status: "PENDING_APPROVAL",
      submittedByUserId: user.id,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/app/purchasing/payments/${batch.id}`);
  revalidatePath("/app/purchasing/payments");
}

export async function approvePaymentBatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const batchId = field(formData, "batchId");
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: {
      id: batchId,
      tenantId: user.tenantId,
      status: "PENDING_APPROVAL",
    },
  });

  if (batch.submittedByUserId === user.id) {
    throw new Error(
      "The user who submitted a payment batch cannot approve the same batch.",
    );
  }

  await prisma.$transaction([
    prisma.paymentBatch.update({
      where: { id: batch.id },
      data: {
        status: "APPROVED",
        approvedByUserId: user.id,
        approvedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "payment_batch.approve",
        resourceType: "PaymentBatch",
        resourceId: batch.id,
        after: {
          batchNumber: batch.batchNumber,
          totalAmount: batch.totalAmount.toString(),
          currencyCode: batch.currencyCode,
        },
      },
    }),
  ]);

  revalidatePath(`/app/purchasing/payments/${batch.id}`);
  revalidatePath("/app/purchasing/payments");
}

export async function completePaymentBatchAction(formData: FormData) {
  const user = await requireAnyRole([
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const batchId = field(formData, "batchId");
  const exportReference = field(formData, "exportReference");
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: {
      id: batchId,
      tenantId: user.tenantId,
      status: { in: ["APPROVED", "EXPORTED", "PROCESSING"] },
    },
    include: { items: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.paymentBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        exportReference: exportReference || batch.exportReference,
        completedByUserId: user.id,
        completedAt: new Date(),
      },
    });

    await tx.paymentBatchItem.updateMany({
      where: { paymentBatchId: batch.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    await tx.supplierInvoice.updateMany({
      where: {
        id: {
          in: batch.items.map((item) => item.supplierInvoiceId),
        },
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });
  });

  revalidatePath(`/app/purchasing/payments/${batch.id}`);
  revalidatePath("/app/purchasing/payments");
  revalidatePath("/app/purchasing/invoices");
}

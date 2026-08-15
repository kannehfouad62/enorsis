"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/core/auth/authorization";
import { assignPaymentBatch } from "@/core/requisition-to-order/payment-readiness";
import { prisma } from "@/lib/prisma";

const financeRoles = ["TENANT_OWNER","TENANT_ADMIN","FINANCE","ACCOUNTS_PAYABLE","PLATFORM_SUPER_ADMIN","PLATFORM_SUPPORT"] as const;
const approvalRoles = ["TENANT_OWNER","TENANT_ADMIN","FINANCE","PLATFORM_SUPER_ADMIN"] as const;

function field(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}
function paymentPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/payments${query ? `?${query}` : ""}`;
}

export async function createPaymentBatchAction(data: FormData) {
  const user = await requireAnyRole([...financeRoles]);
  const readinessCaseId = field(data, "readinessCaseId");
  const paymentDateRaw = field(data, "paymentDate");
  try {
    const readiness = await prisma.apPaymentReadinessCase.findFirstOrThrow({
      where: { id: readinessCaseId, tenantId: user.tenantId, status: "APPROVED", paymentBatchId: null },
    });
    if (readiness.currencyCode !== "USD") {
      throw new Error("Non-USD payment batching requires an approved USD exchange-rate snapshot. Enorsis will not invent an FX equivalent.");
    }
    const invoice = await prisma.supplierInvoice.findFirstOrThrow({
      where: { id: readiness.supplierInvoiceId, tenantId: user.tenantId },
    });
    const count = await prisma.paymentBatch.count({ where: { tenantId: user.tenantId } });
    const batchNumber = `PAYRUN-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
    const amount = readiness.invoiceAmount;
    const batch = await prisma.paymentBatch.create({
      data: {
        tenantId: user.tenantId,
        batchNumber,
        status: "DRAFT",
        currencyCode: readiness.currencyCode,
        invoiceCount: 1,
        totalAmount: amount,
        totalUsdEquivalent: amount,
        paymentDate: paymentDateRaw ? new Date(`${paymentDateRaw}T12:00:00`) : readiness.dueDate,
        description: `Governed payment run for ${readiness.invoiceNumber ?? invoice.invoiceNumber}`,
        createdByUserId: user.id,
        items: {
          create: {
            supplierInvoiceId: invoice.id,
            status: "INCLUDED",
            amount,
            usdEquivalent: amount,
          },
        },
      },
    });
    await assignPaymentBatch({
      readinessCaseId: readiness.id,
      paymentBatchId: batch.id,
      actorUserId: user.id,
    });
    revalidatePath("/app/requisition-to-order/payments");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment batch creation failed.";
    redirect(paymentPath(undefined, message));
  }
  redirect(paymentPath("Payment run created as a draft."));
}

export async function submitPaymentBatchAction(data: FormData) {
  const user = await requireAnyRole([...financeRoles]);
  const batchId = field(data, "batchId");
  await prisma.paymentBatch.updateMany({
    where: { id: batchId, tenantId: user.tenantId, status: "DRAFT" },
    data: { status: "PENDING_APPROVAL", submittedByUserId: user.id, submittedAt: new Date() },
  });
  revalidatePath("/app/requisition-to-order/payments");
  redirect(paymentPath("Payment run submitted for finance authorization."));
}

export async function approvePaymentBatchAction(data: FormData) {
  const user = await requireAnyRole([...approvalRoles]);
  const batchId = field(data, "batchId");
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId, status: "PENDING_APPROVAL" },
  });
  if (batch.submittedByUserId === user.id) {
    redirect(paymentPath(undefined, "Segregation of duties: the user who submitted this payment run cannot be its final approver."));
  }
  await prisma.paymentBatch.update({
    where: { id: batch.id },
    data: { status: "APPROVED", approvedByUserId: user.id, approvedAt: new Date() },
  });
  revalidatePath("/app/requisition-to-order/payments");
  redirect(paymentPath("Payment run authorized."));
}

export async function recordPaymentSubmissionAction(data: FormData) {
  const user = await requireAnyRole([...financeRoles]);
  const batchId = field(data, "batchId");
  const paymentReference = field(data, "paymentReference");
  if (!paymentReference) redirect(paymentPath(undefined, "A bank or payment-provider reference is required."));
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId, status: "APPROVED" },
  });
  await prisma.$transaction([
    prisma.paymentBatch.update({
      where: { id: batch.id },
      data: { status: "PROCESSING", exportedByUserId: user.id, exportedAt: new Date() },
    }),
    prisma.paymentBatchItem.updateMany({
      where: { paymentBatchId: batch.id },
      data: { paymentReference },
    }),
  ]);
  revalidatePath("/app/requisition-to-order/payments");
  redirect(paymentPath("Payment execution recorded. Settlement confirmation is now pending."));
}

export async function confirmSettlementAction(data: FormData) {
  const user = await requireAnyRole([...approvalRoles]);
  const batchId = field(data, "batchId");
  const batch = await prisma.paymentBatch.findFirstOrThrow({
    where: { id: batchId, tenantId: user.tenantId, status: "PROCESSING" },
  });
  const items = await prisma.paymentBatchItem.findMany({ where: { paymentBatchId: batch.id } });
  const invoiceIds = items.map((item) => item.supplierInvoiceId);
  const now = new Date();
  await prisma.$transaction([
    prisma.paymentBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", completedByUserId: user.id, completedAt: now },
    }),
    prisma.paymentBatchItem.updateMany({
      where: { paymentBatchId: batch.id },
      data: { status: "PAID" },
    }),
    prisma.supplierInvoice.updateMany({
      where: { tenantId: user.tenantId, id: { in: invoiceIds } },
      data: { status: "PAID", paidAt: now },
    }),
  ]);
  revalidatePath("/app/requisition-to-order/payments");
  revalidatePath("/app/purchasing/invoices");
  revalidatePath("/app/marketplace/invoices");
  redirect(paymentPath("Settlement confirmed. Linked invoices are now marked PAID."));
}

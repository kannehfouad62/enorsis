"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const financeRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

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

export async function createDraftPaymentRunAction(data: FormData) {
  const user = await requireAnyRole([...financeRoles]);
  const readinessCaseId = field(data, "readinessCaseId");
  const paymentDateRaw = field(data, "paymentDate");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const readiness = await prisma.apPaymentReadinessCase.findFirstOrThrow({
      where: {
        id: readinessCaseId,
        tenantId: user.tenantId,
        status: "APPROVED",
        paymentBatchId: null,
      },
    });

    if (readiness.currencyCode !== "USD") {
      throw new Error(
        "Non-USD payment runs require a governed exchange-rate snapshot before batching.",
      );
    }

    const invoice = await prisma.supplierInvoice.findFirstOrThrow({
      where: {
        id: readiness.supplierInvoiceId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
      },
    });

    const paymentDate = paymentDateRaw
      ? new Date(`${paymentDateRaw}T12:00:00`)
      : readiness.dueDate;

    if (paymentDate && Number.isNaN(paymentDate.getTime())) {
      throw new Error("The selected payment date is invalid.");
    }

    const suffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();

    batchNumber = `PAYRUN-${new Date().getFullYear()}-${suffix}`;

    await prisma.$transaction(async (tx) => {
      const current = await tx.apPaymentReadinessCase.findFirst({
        where: {
          id: readiness.id,
          tenantId: user.tenantId,
          status: "APPROVED",
          paymentBatchId: null,
        },
      });

      if (!current) {
        throw new Error(
          "This readiness case has already been batched or is no longer approved.",
        );
      }

      const batch = await tx.paymentBatch.create({
        data: {
          tenantId: user.tenantId,
          batchNumber: batchNumber!,
          status: "DRAFT",
          currencyCode: readiness.currencyCode,
          invoiceCount: 1,
          totalAmount: readiness.invoiceAmount,
          totalUsdEquivalent: readiness.invoiceAmount,
          paymentDate,
          description:
            `Draft payment run for ${readiness.invoiceNumber ?? invoice.invoiceNumber}`,
          createdByUserId: user.id,
          items: {
            create: {
              supplierInvoiceId: invoice.id,
              status: "INCLUDED",
              amount: readiness.invoiceAmount,
              usdEquivalent: readiness.invoiceAmount,
            },
          },
        },
      });

      const updated = await tx.apPaymentReadinessCase.updateMany({
        where: {
          id: readiness.id,
          tenantId: user.tenantId,
          status: "APPROVED",
          paymentBatchId: null,
        },
        data: {
          status: "BATCHED",
          paymentBatchId: batch.id,
          batchedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new Error(
          "The readiness case changed while the payment run was being created.",
        );
      }
    });

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");
  } catch (error) {
    console.error("Draft payment run creation failed", {
      readinessCaseId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "Draft payment run creation failed.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Draft payment run ${batchNumber ?? ""} created successfully.`,
    ),
  );
}

export async function submitPaymentRunForApprovalAction(
  data: FormData,
) {
  const user = await requireAnyRole([...financeRoles]);
  const paymentBatchId = field(data, "paymentBatchId");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: "DRAFT",
      },
      include: {
        items: true,
      },
    });

    if (!batch) {
      throw new Error(
        "This payment run is no longer a draft or is not available to your organization.",
      );
    }

    const includedItems = batch.items.filter(
      (item) => item.status === "INCLUDED",
    );

    if (includedItems.length === 0) {
      throw new Error(
        "A payment run must contain at least one included invoice before submission.",
      );
    }

    if (Number(batch.totalAmount) <= 0 || batch.invoiceCount <= 0) {
      throw new Error(
        "The payment run total and invoice count must be greater than zero before submission.",
      );
    }

    const itemTotal = includedItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    if (Math.abs(itemTotal - Number(batch.totalAmount)) > 0.005) {
      throw new Error(
        "The payment run total does not match the included invoice total. Review the batch before submitting.",
      );
    }

    const updated = await prisma.paymentBatch.updateMany({
      where: {
        id: batch.id,
        tenantId: user.tenantId,
        status: "DRAFT",
      },
      data: {
        status: "PENDING_APPROVAL",
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        "The payment run changed while it was being submitted. Refresh and try again.",
      );
    }

    batchNumber = batch.batchNumber;

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-runs");
  } catch (error) {
    console.error("Payment run submission failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment run could not be submitted.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} submitted for authorization.`,
    ),
  );
}


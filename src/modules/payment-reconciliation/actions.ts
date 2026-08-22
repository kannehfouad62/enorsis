"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const reconciliationRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function reconciliationPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/reconciliation${query ? `?${query}` : ""}`;
}

export async function recordBankReconciliationAction(data: FormData) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const paymentBatchId = field(data, "paymentBatchId");
  const statementReference = field(data, "statementReference");
  const bankReference = field(data, "bankReference") || null;
  const reconciliationDateRaw = field(data, "reconciliationDate");
  const settledAmountRaw = field(data, "settledAmount");
  const classification = field(data, "classification") as
    | "MATCHED"
    | "PARTIAL"
    | "UNMATCHED"
    | "DUPLICATE";
  const notes = field(data, "notes") || null;

  let errorMessage: string | null = null;
  let batchNumber: string | null = null;

  try {
    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: { in: ["PROCESSING", "COMPLETED"] },
      },
    });

    if (!batch) {
      throw new Error(
        "Only processing or completed payment runs can be reconciled.",
      );
    }

    const existing = await prisma.bankPaymentReconciliation.findUnique({
      where: { paymentBatchId: batch.id },
    });

    if (existing) {
      throw new Error(
        `Payment run ${batch.batchNumber} already has a reconciliation record.`,
      );
    }

    if (!statementReference) {
      throw new Error(
        "A bank statement or settlement reference is required.",
      );
    }

    const settledAmount = Number(settledAmountRaw);
    if (!Number.isFinite(settledAmount) || settledAmount < 0) {
      throw new Error("Enter a valid settled amount.");
    }

    const reconciliationDate = reconciliationDateRaw
      ? new Date(`${reconciliationDateRaw}T12:00:00`)
      : new Date();

    if (Number.isNaN(reconciliationDate.getTime())) {
      throw new Error("The reconciliation date is invalid.");
    }

    const expectedAmount = Number(batch.totalAmount);
    const variance = Math.abs(expectedAmount - settledAmount);

    if (classification === "MATCHED" && variance > 0.005) {
      throw new Error(
        "A MATCHED reconciliation requires the settled amount to equal the payment-run total.",
      );
    }

    if (
      classification === "PARTIAL" &&
      !(settledAmount > 0 && settledAmount < expectedAmount)
    ) {
      throw new Error(
        "A PARTIAL reconciliation requires a positive settled amount below the payment-run total.",
      );
    }

    if (classification === "DUPLICATE" && !bankReference) {
      throw new Error(
        "A bank reference is required when classifying a duplicate settlement.",
      );
    }

    await prisma.bankPaymentReconciliation.create({
      data: {
        tenantId: user.tenantId,
        paymentBatchId: batch.id,
        statementReference,
        bankReference,
        currencyCode: batch.currencyCode,
        expectedAmount: batch.totalAmount,
        settledAmount,
        status: classification,
        resolutionStatus:
          classification === "MATCHED"
            ? "RESOLVED"
            : "OPEN",
        reconciliationDate,
        notes,
        recordedByUserId: user.id,
        resolvedByUserId:
          classification === "MATCHED"
            ? user.id
            : null,
        resolvedAt:
          classification === "MATCHED"
            ? new Date()
            : null,
      },
    });

    batchNumber = batch.batchNumber;

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        classification === "MATCHED"
          ? "PaymentReconciliation.Matched"
          : "PaymentReconciliation.Exception",
      recipientUserId: user.id,
      recipientAddress: null,
      title:
        classification === "MATCHED"
          ? "Payment reconciliation matched"
          : "Payment reconciliation exception recorded",
      message:
        `Payment run ${batch.batchNumber} was reconciled as ${classification}. Expected ${batch.currencyCode} ${expectedAmount.toFixed(
          2,
        )}; bank settlement ${batch.currencyCode} ${settledAmount.toFixed(2)}.`,
      actionUrl: "/app/requisition-to-order/reconciliation",
      priority: classification === "MATCHED" ? "NORMAL" : "HIGH",
      channels: ["IN_APP"],
      data: {
        paymentBatchId: batch.id,
        classification,
        statementReference,
        bankReference,
      },
    });

    revalidatePath("/app/requisition-to-order/reconciliation");
    revalidatePath("/app/requisition-to-order/payments");
  } catch (error) {
    console.error("Bank reconciliation recording failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation record could not be saved.";
  }

  if (errorMessage) {
    redirect(reconciliationPath(undefined, errorMessage));
  }

  redirect(
    reconciliationPath(
      `Payment run ${batchNumber ?? ""} reconciled successfully.`,
    ),
  );
}

export async function updateReconciliationResolutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const reconciliationId = field(
    data,
    "reconciliationId",
  );
  const resolutionStatus = field(
    data,
    "resolutionStatus",
  ) as
    | "ACKNOWLEDGED"
    | "INVESTIGATING"
    | "RESOLVED";
  const resolutionNote = field(
    data,
    "resolutionNote",
  );

  let errorMessage: string | null = null;

  try {
    if (
      ![
        "ACKNOWLEDGED",
        "INVESTIGATING",
        "RESOLVED",
      ].includes(resolutionStatus)
    ) {
      throw new Error(
        "Select a valid reconciliation resolution action.",
      );
    }

    if (resolutionNote.length < 5) {
      throw new Error(
        "Provide a short corrective or investigation note.",
      );
    }

    const reconciliation =
      await prisma.bankPaymentReconciliation.findFirst({
        where: {
          id: reconciliationId,
          tenantId: user.tenantId,
          status: {
            in: [
              "PARTIAL",
              "UNMATCHED",
              "DUPLICATE",
            ],
          },
        },
      });

    if (!reconciliation) {
      throw new Error(
        "This reconciliation exception is not available for resolution.",
      );
    }

    if (
      reconciliation.resolutionStatus ===
      "RESOLVED"
    ) {
      throw new Error(
        "This reconciliation exception is already resolved.",
      );
    }

    const historyLine =
      `[${new Date().toISOString()}] ${resolutionStatus} by ${user.id}: ${resolutionNote}`;

    const resolutionNotes = [
      reconciliation.resolutionNotes,
      historyLine,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.bankPaymentReconciliation.update({
      where: {
        id: reconciliation.id,
      },
      data: {
        resolutionStatus,
        resolutionNotes,
        ...(resolutionStatus === "RESOLVED"
          ? {
              resolvedByUserId: user.id,
              resolvedAt: new Date(),
            }
          : {
              resolvedByUserId: null,
              resolvedAt: null,
            }),
      },
    });

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        resolutionStatus === "RESOLVED"
          ? "PaymentReconciliation.ExceptionResolved"
          : "PaymentReconciliation.ExceptionProgressed",
      recipientUserId: user.id,
      recipientAddress: null,
      title:
        resolutionStatus === "RESOLVED"
          ? "Reconciliation exception resolved"
          : "Reconciliation exception updated",
      message:
        `Reconciliation ${reconciliation.statementReference} is now ${resolutionStatus}. ${resolutionNote}`,
      actionUrl:
        "/app/requisition-to-order/reconciliation",
      priority:
        resolutionStatus === "RESOLVED"
          ? "NORMAL"
          : "HIGH",
      channels: ["IN_APP"],
      data: {
        reconciliationId: reconciliation.id,
        paymentBatchId:
          reconciliation.paymentBatchId,
        classification: reconciliation.status,
        resolutionStatus,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
  } catch (error) {
    console.error(
      "Reconciliation exception resolution failed",
      {
        reconciliationId,
        tenantId: user.tenantId,
        actorUserId: user.id,
        resolutionStatus,
        error,
      },
    );

    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation exception could not be updated.";
  }

  if (errorMessage) {
    redirect(
      reconciliationPath(undefined, errorMessage),
    );
  }

  redirect(
    reconciliationPath(
      `Reconciliation exception updated to ${resolutionStatus}.`,
    ),
  );
}

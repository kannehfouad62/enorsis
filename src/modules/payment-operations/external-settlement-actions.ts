"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/core/auth/authorization";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const buyerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

const supplierRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
] as const;

const settlementPath =
  "/app/requisition-to-order/settlements/external";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

function redirectMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `${settlementPath}?${type}=${encodeURIComponent(message)}`,
  );
}

async function queueNotification(input: {
  tenantId: string;
  recipientUserId?: string | null;
  recipientAddress?: string | null;
  eventType: string;
  title: string;
  message: string;
}) {
  return createEnterpriseNotification({
    tenantId: input.tenantId,
    eventType: input.eventType,
    recipientUserId: input.recipientUserId ?? null,
    recipientAddress: input.recipientAddress ?? null,
    title: input.title,
    message: input.message,
    actionUrl: settlementPath,
    priority: "HIGH",
    channels: input.recipientAddress
      ? ["IN_APP", "EMAIL"]
      : ["IN_APP"],
    data: {
      sourceModule: "payment-operations",
      settlementChannel: "EXTERNAL",
    },
  });
}

async function notifyBuyerFinance(input: {
  tenantId: string;
  eventType: string;
  title: string;
  message: string;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      roles: {
        hasSome: [
          "TENANT_OWNER",
          "TENANT_ADMIN",
          "FINANCE",
          "ACCOUNTS_PAYABLE",
        ],
      },
      user: { isActive: true },
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  await Promise.all(
    memberships.map((membership) =>
      queueNotification({
        tenantId: input.tenantId,
        recipientUserId: membership.user.id,
        recipientAddress: membership.user.email,
        eventType: input.eventType,
        title: input.title,
        message: input.message,
      }),
    ),
  );
}

async function notifySupplier(input: {
  buyerTenantId: string;
  sellerTenantId?: string | null;
  supplierId: string;
  eventType: string;
  title: string;
  message: string;
  settlementId: string;
}) {
  if (input.sellerTenantId) {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId: input.sellerTenantId,
        status: "ACTIVE",
        user: { isActive: true },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    await Promise.all(
      memberships.map((membership) =>
        queueNotification({
          tenantId: input.sellerTenantId!,
          recipientUserId: membership.user.id,
          recipientAddress: membership.user.email,
          eventType: input.eventType,
          title: input.title,
          message: input.message,
        }),
      ),
    );
  }

  const portalUsers = await prisma.supplierPortalUser.findMany({
    where: {
      tenantId: input.buyerTenantId,
      supplierId: input.supplierId,
      status: "ACTIVE",
    },
    select: { email: true },
  });

  if (portalUsers.length > 0) {
    await Promise.all(
      portalUsers.map((portalUser) =>
        queueNotification({
          tenantId: input.buyerTenantId,
          recipientAddress: portalUser.email,
          eventType: input.eventType,
          title: input.title,
          message: input.message,
        }),
      ),
    );

    await prisma.supplierPortalMessage.create({
      data: {
        tenantId: input.buyerTenantId,
        supplierId: input.supplierId,
        direction: "BUYER_TO_SUPPLIER",
        subject: input.title,
        body: input.message,
        relatedType: "PaymentSettlement",
        relatedId: input.settlementId,
      },
    });
  }
}

export async function recordExternalPaymentAction(data: FormData) {
  const user = await requireAnyRole([...buyerRoles]);

  try {
    const readinessCaseId = field(data, "readinessCaseId");
    const paymentReference = field(data, "paymentReference");
    const externalPaymentMethod = field(
      data,
      "externalPaymentMethod",
    );
    const externalSystemName =
      field(data, "externalSystemName") || null;
    const evidenceReference =
      field(data, "evidenceReference") || null;
    const notes = field(data, "notes") || null;
    const paymentAmount = Number(field(data, "paymentAmount"));
    const paymentDateRaw = field(data, "paymentDate");

    if (!readinessCaseId) {
      throw new Error("Select an approved payable.");
    }
    if (!paymentReference || paymentReference.length < 3) {
      throw new Error("Enter a valid payment reference.");
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    if (!externalPaymentMethod) {
      throw new Error("Select an external payment method.");
    }
    if (!paymentDateRaw) {
      throw new Error("Enter the payment date.");
    }

    const paymentDate = new Date(`${paymentDateRaw}T12:00:00`);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new Error("The payment date is invalid.");
    }

    const readiness = await prisma.apPaymentReadinessCase.findFirst({
      where: {
        id: readinessCaseId,
        tenantId: user.tenantId,
        status: "APPROVED",
        paymentBatchId: null,
      },
    });

    if (!readiness) {
      throw new Error(
        "Only an approved, unbatched payable can be settled externally.",
      );
    }

    if (
      readiness.settlementChannel &&
      readiness.settlementChannel !== "EXTERNAL"
    ) {
      throw new Error(
        "This payable is already assigned to Enorsis-native payment processing.",
      );
    }

    const invoice = await prisma.supplierInvoice.findFirst({
      where: {
        id: readiness.supplierInvoiceId,
        tenantId: user.tenantId,
      },
    });

    if (!invoice) {
      throw new Error(
        "The approved payable is not linked to a valid supplier invoice.",
      );
    }

    const totals = await prisma.paymentSettlement.aggregate({
      where: {
        tenantId: user.tenantId,
        supplierInvoiceId: invoice.id,
        status: {
          in: [
            "BUYER_RECORDED",
            "AWAITING_SUPPLIER_CONFIRMATION",
            "CONFIRMED",
          ],
        },
      },
      _sum: { paymentAmount: true },
    });

    const committed = Number(totals._sum.paymentAmount ?? 0);
    const outstanding = Number(invoice.totalAmount) - committed;

    if (paymentAmount > outstanding + 0.005) {
      throw new Error(
        `Payment exceeds the remaining payable balance of ${invoice.currencyCode} ${Math.max(
          outstanding,
          0,
        ).toFixed(2)}.`,
      );
    }

    const settlement = await prisma.$transaction(
      async (tx) => {
        const created = await tx.paymentSettlement.create({
          data: {
            tenantId: user.tenantId,
            sellerTenantId:
              invoice.generatedBySellerTenantId ?? null,
            supplierInvoiceId: invoice.id,
            readinessCaseId: readiness.id,
            channel: "EXTERNAL",
            status: "AWAITING_SUPPLIER_CONFIRMATION",
            currencyCode: invoice.currencyCode,
            invoiceAmount: invoice.totalAmount,
            paymentAmount,
            usdEquivalent:
              paymentAmount * Number(invoice.exchangeRateToUsd),
            externalPaymentMethod:
              externalPaymentMethod as
                | "ACH"
                | "WIRE_TRANSFER"
                | "BANK_TRANSFER"
                | "CHECK"
                | "CARD"
                | "ERP_PAYMENT"
                | "TREASURY_PLATFORM"
                | "MOBILE_MONEY"
                | "CASH"
                | "OTHER",
            externalSystemName,
            paymentReference,
            paymentDate,
            evidenceReference,
            buyerRecordedByUserId: user.id,
            buyerRecordedAt: new Date(),
            notes,
          },
        });

        await tx.apPaymentReadinessCase.update({
          where: { id: readiness.id },
          data: { settlementChannel: "EXTERNAL" },
        });

        return created;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    const message =
      `${invoice.invoiceNumber} — ${invoice.currencyCode} ${paymentAmount.toFixed(
        2,
      )} was recorded as paid outside Enorsis. Reference: ${paymentReference}. Confirm receipt or report a payment issue in Enorsis.`;

    await notifySupplier({
      buyerTenantId: user.tenantId,
      sellerTenantId:
        invoice.generatedBySellerTenantId ?? null,
      supplierId: invoice.supplierId,
      eventType:
        "PaymentSettlement.SupplierConfirmationRequired",
      title: "External payment requires confirmation",
      message,
      settlementId: settlement.id,
    });

    await publishDomainEvent({
      tenantId: user.tenantId,
      eventType: "PaymentSettlement.ExternalRecorded",
      aggregateType: "PaymentSettlement",
      aggregateId: settlement.id,
      sourceModule: "payment-operations",
      actorUserId: user.id,
      payload: {
        invoiceNumber: invoice.invoiceNumber,
        paymentReference,
        paymentAmount,
        currencyCode: invoice.currencyCode,
      },
    });

    await recordEnterpriseActivity({
      tenantId: user.tenantId,
      activityType: "PaymentSettlement.ExternalRecorded",
      sourceModule: "payment-operations",
      title: "External payment recorded",
      description: message,
      severity: "SUCCESS",
      actorUserId: user.id,
      subjectType: "PaymentSettlement",
      subjectId: settlement.id,
      subjectLabel: paymentReference,
      actionUrl: settlementPath,
    });

    revalidatePath(settlementPath);
    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");

    redirectMessage(
      "success",
      `External payment ${paymentReference} recorded. Supplier confirmation is pending.`,
    );
  } catch (error) {
    console.error("External payment recording failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "External payment could not be recorded.",
    );
  }
}

export async function confirmExternalPaymentReceiptAction(
  data: FormData,
) {
  const user = await requireAnyRole([...supplierRoles]);

  try {
    const settlementId = field(data, "settlementId");

    const settlement = await prisma.paymentSettlement.findFirst({
      where: {
        id: settlementId,
        sellerTenantId: user.tenantId,
        status: "AWAITING_SUPPLIER_CONFIRMATION",
      },
    });

    if (!settlement) {
      throw new Error(
        "This payment is not awaiting confirmation for your supplier tenant.",
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const changed = await tx.paymentSettlement.updateMany({
          where: {
            id: settlement.id,
            sellerTenantId: user.tenantId,
            status: "AWAITING_SUPPLIER_CONFIRMATION",
          },
          data: {
            status: "CONFIRMED",
            supplierConfirmedByUserId: user.id,
            supplierConfirmedAt: new Date(),
          },
        });

        if (changed.count !== 1) {
          throw new Error(
            "The settlement changed while confirmation was being recorded.",
          );
        }

        const invoice =
          await tx.supplierInvoice.findUniqueOrThrow({
            where: { id: settlement.supplierInvoiceId },
          });

        const confirmed = await tx.paymentSettlement.aggregate({
          where: {
            tenantId: settlement.tenantId,
            supplierInvoiceId: settlement.supplierInvoiceId,
            status: "CONFIRMED",
          },
          _sum: { paymentAmount: true },
        });

        const confirmedAmount = Number(
          confirmed._sum.paymentAmount ?? 0,
        );
        const invoiceAmount = Number(invoice.totalAmount);
        const fullyPaid =
          confirmedAmount + 0.005 >= invoiceAmount;

        if (fullyPaid) {
          const now = new Date();

          await tx.supplierInvoice.update({
            where: { id: invoice.id },
            data: {
              status: "PAID",
              paidAt: now,
              paymentReference:
                settlement.paymentReference ?? undefined,
            },
          });

          if (settlement.readinessCaseId) {
            await tx.apPaymentReadinessCase.updateMany({
              where: {
                id: settlement.readinessCaseId,
                tenantId: settlement.tenantId,
              },
              data: {
                status: "PAID",
                paidAt: now,
              },
            });
          }
        }

        return {
          invoice,
          confirmedAmount,
          invoiceAmount,
          fullyPaid,
        };
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    const message = result.fullyPaid
      ? `Supplier confirmed full receipt for ${result.invoice.invoiceNumber}. The invoice is now fully settled.`
      : `Supplier confirmed receipt of ${settlement.currencyCode} ${settlement.paymentAmount.toString()} for ${result.invoice.invoiceNumber}. Confirmed cumulative payment is ${settlement.currencyCode} ${result.confirmedAmount.toFixed(
          2,
        )} of ${settlement.currencyCode} ${result.invoiceAmount.toFixed(
          2,
        )}.`;

    await notifyBuyerFinance({
      tenantId: settlement.tenantId,
      eventType: result.fullyPaid
        ? "PaymentSettlement.FullySettled"
        : "PaymentSettlement.PartiallyConfirmed",
      title: result.fullyPaid
        ? "External payment fully settled"
        : "External payment receipt confirmed",
      message,
    });

    await publishDomainEvent({
      tenantId: settlement.tenantId,
      eventType: "PaymentSettlement.SupplierConfirmed",
      aggregateType: "PaymentSettlement",
      aggregateId: settlement.id,
      sourceModule: "payment-operations",
      actorUserId: user.id,
      payload: {
        paymentAmount: settlement.paymentAmount.toString(),
        confirmedAmount: result.confirmedAmount,
        fullyPaid: result.fullyPaid,
      },
    });

    await recordEnterpriseActivity({
      tenantId: settlement.tenantId,
      activityType: "PaymentSettlement.SupplierConfirmed",
      sourceModule: "payment-operations",
      title: "Supplier confirmed external payment",
      description: message,
      severity: "SUCCESS",
      actorUserId: user.id,
      subjectType: "PaymentSettlement",
      subjectId: settlement.id,
      subjectLabel:
        settlement.paymentReference ?? settlement.id,
      actionUrl: settlementPath,
    });

    revalidatePath(settlementPath);
    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");

    redirectMessage("success", message);
  } catch (error) {
    console.error("External payment confirmation failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Payment receipt confirmation failed.",
    );
  }
}

export async function disputeExternalPaymentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...supplierRoles]);

  try {
    const settlementId = field(data, "settlementId");
    const reason = field(data, "reason");

    if (reason.length < 5) {
      throw new Error(
        "Provide a short explanation of the payment issue.",
      );
    }

    const settlement = await prisma.paymentSettlement.findFirst({
      where: {
        id: settlementId,
        sellerTenantId: user.tenantId,
        status: "AWAITING_SUPPLIER_CONFIRMATION",
      },
    });

    if (!settlement) {
      throw new Error(
        "This payment is not awaiting confirmation for your supplier tenant.",
      );
    }

    await prisma.paymentSettlement.update({
      where: { id: settlement.id },
      data: {
        status: "DISPUTED",
        supplierDisputedByUserId: user.id,
        supplierDisputedAt: new Date(),
        disputeReason: reason,
      },
    });

    const message =
      `Supplier reported an issue with external payment ${settlement.paymentReference ?? settlement.id}: ${reason}`;

    await notifyBuyerFinance({
      tenantId: settlement.tenantId,
      eventType: "PaymentSettlement.SupplierDisputed",
      title: "Supplier disputed external payment",
      message,
    });

    await publishDomainEvent({
      tenantId: settlement.tenantId,
      eventType: "PaymentSettlement.SupplierDisputed",
      aggregateType: "PaymentSettlement",
      aggregateId: settlement.id,
      sourceModule: "payment-operations",
      actorUserId: user.id,
      payload: {
        reason,
        paymentReference: settlement.paymentReference,
      },
    });

    await recordEnterpriseActivity({
      tenantId: settlement.tenantId,
      activityType: "PaymentSettlement.SupplierDisputed",
      sourceModule: "payment-operations",
      title: "External payment disputed",
      description: message,
      severity: "WARNING",
      actorUserId: user.id,
      subjectType: "PaymentSettlement",
      subjectId: settlement.id,
      subjectLabel:
        settlement.paymentReference ?? settlement.id,
      actionUrl: settlementPath,
    });

    revalidatePath(settlementPath);

    redirectMessage(
      "success",
      "Payment issue reported. Buyer finance has been notified.",
    );
  } catch (error) {
    console.error("External payment dispute failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Payment issue could not be reported.",
    );
  }
}

export async function resolveExternalPaymentDisputeAction(
  data: FormData,
) {
  const user = await requireAnyRole([...buyerRoles]);

  try {
    const settlementId = field(data, "settlementId");
    const resolutionNotes = field(data, "resolutionNotes");
    const action = field(data, "resolutionAction");

    if (resolutionNotes.length < 5) {
      throw new Error(
        "Provide resolution notes explaining the financial disposition.",
      );
    }

    if (!["REOPEN_CONFIRMATION", "CANCEL"].includes(action)) {
      throw new Error("Select a valid dispute resolution action.");
    }

    const settlement = await prisma.paymentSettlement.findFirst({
      where: {
        id: settlementId,
        tenantId: user.tenantId,
        status: "DISPUTED",
      },
    });

    if (!settlement) {
      throw new Error(
        "This disputed external payment is no longer available for resolution.",
      );
    }

    const nextStatus =
      action === "CANCEL"
        ? "CANCELLED"
        : "AWAITING_SUPPLIER_CONFIRMATION";

    await prisma.paymentSettlement.update({
      where: { id: settlement.id },
      data: {
        status: nextStatus,
        notes: settlement.notes
          ? `${settlement.notes}\n\nDispute resolution: ${resolutionNotes}`
          : `Dispute resolution: ${resolutionNotes}`,
      },
    });

    if (nextStatus === "CANCELLED") {
      const activeSettlements =
        await prisma.paymentSettlement.count({
          where: {
            tenantId: settlement.tenantId,
            readinessCaseId: settlement.readinessCaseId,
            status: {
              in: [
                "BUYER_RECORDED",
                "AWAITING_SUPPLIER_CONFIRMATION",
                "CONFIRMED",
                "CONFIRMATION_OVERDUE",
              ],
            },
          },
        });

      if (
        activeSettlements === 0 &&
        settlement.readinessCaseId
      ) {
        await prisma.apPaymentReadinessCase.updateMany({
          where: {
            id: settlement.readinessCaseId,
            tenantId: settlement.tenantId,
            status: "APPROVED",
            paymentBatchId: null,
          },
          data: {
            settlementChannel: null,
          },
        });
      }
    }

    const message =
      nextStatus === "CANCELLED"
        ? `External payment ${settlement.paymentReference ?? settlement.id} was cancelled after dispute review. ${resolutionNotes}`
        : `External payment ${settlement.paymentReference ?? settlement.id} was reopened for supplier confirmation. ${resolutionNotes}`;

    await publishDomainEvent({
      tenantId: settlement.tenantId,
      eventType:
        nextStatus === "CANCELLED"
          ? "PaymentSettlement.Cancelled"
          : "PaymentSettlement.DisputeResolved",
      aggregateType: "PaymentSettlement",
      aggregateId: settlement.id,
      sourceModule: "payment-operations",
      actorUserId: user.id,
      payload: {
        resolutionAction: action,
        resolutionNotes,
      },
    });

    await recordEnterpriseActivity({
      tenantId: settlement.tenantId,
      activityType:
        nextStatus === "CANCELLED"
          ? "PaymentSettlement.Cancelled"
          : "PaymentSettlement.DisputeResolved",
      sourceModule: "payment-operations",
      title:
        nextStatus === "CANCELLED"
          ? "External payment cancelled"
          : "External payment dispute resolved",
      description: message,
      severity:
        nextStatus === "CANCELLED"
          ? "WARNING"
          : "SUCCESS",
      actorUserId: user.id,
      subjectType: "PaymentSettlement",
      subjectId: settlement.id,
      subjectLabel:
        settlement.paymentReference ?? settlement.id,
      actionUrl: settlementPath,
    });

    revalidatePath(settlementPath);
    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");

    redirectMessage("success", message);
  } catch (error) {
    console.error("External payment dispute resolution failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "The external payment dispute could not be resolved.",
    );
  }
}

export async function cancelExternalPaymentAction(
  data: FormData,
) {
  const user = await requireAnyRole([...buyerRoles]);

  try {
    const settlementId = field(data, "settlementId");
    const cancellationReason = field(
      data,
      "cancellationReason",
    );

    if (cancellationReason.length < 5) {
      throw new Error(
        "Provide a reason for cancelling the external payment record.",
      );
    }

    const settlement = await prisma.paymentSettlement.findFirst({
      where: {
        id: settlementId,
        tenantId: user.tenantId,
        status: {
          in: [
            "BUYER_RECORDED",
            "AWAITING_SUPPLIER_CONFIRMATION",
            "CONFIRMATION_OVERDUE",
          ],
        },
      },
    });

    if (!settlement) {
      throw new Error(
        "Only an unconfirmed external payment can be cancelled.",
      );
    }

    await prisma.paymentSettlement.update({
      where: { id: settlement.id },
      data: {
        status: "CANCELLED",
        notes: settlement.notes
          ? `${settlement.notes}\n\nCancellation: ${cancellationReason}`
          : `Cancellation: ${cancellationReason}`,
      },
    });

    const activeSettlements =
      await prisma.paymentSettlement.count({
        where: {
          tenantId: settlement.tenantId,
          readinessCaseId: settlement.readinessCaseId,
          status: {
            in: [
              "BUYER_RECORDED",
              "AWAITING_SUPPLIER_CONFIRMATION",
              "CONFIRMED",
              "CONFIRMATION_OVERDUE",
            ],
          },
        },
      });

    if (
      activeSettlements === 0 &&
      settlement.readinessCaseId
    ) {
      await prisma.apPaymentReadinessCase.updateMany({
        where: {
          id: settlement.readinessCaseId,
          tenantId: settlement.tenantId,
          status: "APPROVED",
          paymentBatchId: null,
        },
        data: {
          settlementChannel: null,
        },
      });
    }

    const message =
      `External payment ${settlement.paymentReference ?? settlement.id} was cancelled: ${cancellationReason}`;

    await publishDomainEvent({
      tenantId: settlement.tenantId,
      eventType: "PaymentSettlement.Cancelled",
      aggregateType: "PaymentSettlement",
      aggregateId: settlement.id,
      sourceModule: "payment-operations",
      actorUserId: user.id,
      payload: { cancellationReason },
    });

    await recordEnterpriseActivity({
      tenantId: settlement.tenantId,
      activityType: "PaymentSettlement.Cancelled",
      sourceModule: "payment-operations",
      title: "External payment cancelled",
      description: message,
      severity: "WARNING",
      actorUserId: user.id,
      subjectType: "PaymentSettlement",
      subjectId: settlement.id,
      subjectLabel:
        settlement.paymentReference ?? settlement.id,
      actionUrl: settlementPath,
    });

    revalidatePath(settlementPath);
    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");

    redirectMessage("success", message);
  } catch (error) {
    console.error("External payment cancellation failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    redirectMessage(
      "error",
      error instanceof Error
        ? error.message
        : "The external payment could not be cancelled.",
    );
  }
}


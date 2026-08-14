import "server-only";

import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";
import { evaluateThreeWayMatch } from "@/modules/procure-to-pay/matching";
import { approvePaymentReadiness } from "@/core/requisition-to-order/payment-readiness";
import { approveThreeWayMatchForPayment } from "@/core/requisition-to-order/three-way-match";

async function notifyFinanceUsers(input: {
  tenantId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl: string;
  correlationId?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      roles: {
        hasSome: [
          "ACCOUNTS_PAYABLE",
          "FINANCE",
          "TENANT_ADMIN",
          "TENANT_OWNER",
        ],
      },
    },
    include: { user: { select: { id: true, email: true } } },
    take: 100,
  });

  for (const membership of memberships) {
    await createEnterpriseNotification({
      tenantId: input.tenantId,
      eventType: input.eventType,
      recipientUserId: membership.user.id,
      recipientAddress: membership.user.email ?? undefined,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      channels: membership.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
      priority: "HIGH",
      correlationId: input.correlationId ?? undefined,
    });
  }
}

export async function advanceClassicProcureToPayAfterReceipt(input: {
  purchaseOrderId: string;
  actorUserId: string;
}) {
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: input.purchaseOrderId },
    include: {
      supplier: true,
      invoices: {
        include: {
          lines: { include: { purchaseOrderLine: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (order.status !== "RECEIVED") {
    return { status: "WAITING_FOR_FULL_RECEIPT" as const, invoicesAdvanced: 0 };
  }

  if (order.invoices.length === 0) {
    await notifyFinanceUsers({
      tenantId: order.tenantId,
      eventType: "AccountsPayable.InvoiceRequiredAfterReceipt",
      title: "Goods received — supplier invoice required",
      message:
        `${order.purchaseOrderNumber} is fully received. Capture the supplier invoice so Enorsis can continue invoice matching and payment readiness.`,
      actionUrl: "/app/purchasing/invoices",
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: order.tenantId,
        userId: input.actorUserId,
        actorType: "SYSTEM",
        actorId: input.actorUserId,
        action: "finance.readiness.invoice_required_after_receipt",
        resourceType: "PurchaseOrder",
        resourceId: order.id,
        after: {
          purchaseOrderNumber: order.purchaseOrderNumber,
          supplierId: order.supplierId,
          status: order.status,
        },
      },
    });

    return { status: "INVOICE_REQUIRED" as const, invoicesAdvanced: 0 };
  }

  let invoicesAdvanced = 0;
  let exceptionsFound = 0;

  for (const invoice of order.invoices) {
    if (["PAYMENT_READY", "PAID", "CANCELLED", "REJECTED"].includes(invoice.status)) {
      continue;
    }

    const result = evaluateThreeWayMatch(
      invoice.lines
        .filter((line) => line.purchaseOrderLine)
        .map((line) => ({
          description: line.description,
          orderedQuantity: Number(line.purchaseOrderLine!.quantity),
          receivedQuantity: Number(line.purchaseOrderLine!.receivedQuantity),
          invoicedQuantity: Number(line.quantity),
          orderedUnitPrice: Number(line.purchaseOrderLine!.unitPrice),
          invoicedUnitPrice: Number(line.unitPrice),
        })),
      { quantityPercent: 0, pricePercent: 0 },
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

        await tx.supplierInvoice.update({
          where: { id: invoice.id },
          data: {
            status: "EXCEPTION",
            matchStatus: "EXCEPTION",
            approvedAt: null,
            paymentReadyAt: null,
          },
        });

        exceptionsFound += result.exceptions.length;
        return;
      }

      await tx.supplierInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAYMENT_READY",
          matchStatus: "MATCHED",
          approvedAt: invoice.approvedAt ?? new Date(),
          paymentReadyAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: order.tenantId,
          userId: input.actorUserId,
          actorType: "SYSTEM",
          actorId: input.actorUserId,
          action: "finance.readiness.auto_completed_after_receipt",
          resourceType: "SupplierInvoice",
          resourceId: invoice.id,
          before: {
            status: invoice.status,
            matchStatus: invoice.matchStatus,
          },
          after: {
            status: "PAYMENT_READY",
            matchStatus: "MATCHED",
            purchaseOrderNumber: order.purchaseOrderNumber,
          },
        },
      });

      invoicesAdvanced += 1;
    });
  }

  if (invoicesAdvanced > 0) {
    await notifyFinanceUsers({
      tenantId: order.tenantId,
      eventType: "AccountsPayable.PaymentReadinessCompleted",
      title: "Payment readiness completed",
      message:
        `${invoicesAdvanced} invoice${invoicesAdvanced === 1 ? "" : "s"} for ${order.purchaseOrderNumber} matched exactly and ${invoicesAdvanced === 1 ? "is" : "are"} ready for payment processing.`,
      actionUrl: "/app/purchasing/invoices",
    });
  }

  if (exceptionsFound > 0) {
    await notifyFinanceUsers({
      tenantId: order.tenantId,
      eventType: "InvoiceMatch.ExceptionsDetected",
      title: "Invoice match exceptions require review",
      message:
        `${order.purchaseOrderNumber} produced ${exceptionsFound} match exception${exceptionsFound === 1 ? "" : "s"}. Review is required before payment.`,
      actionUrl: "/app/purchasing/invoices",
    });
  }

  return {
    status: exceptionsFound > 0 ? ("MATCH_EXCEPTION" as const) : ("PAYMENT_READY" as const),
    invoicesAdvanced,
    exceptionsFound,
  };
}

export async function advanceGovernedRtoAfterReceipt(input: {
  purchaseOrderExecutionId: string;
  actorUserId: string;
}) {
  const execution = await prisma.purchaseOrderExecution.findUniqueOrThrow({
    where: { id: input.purchaseOrderExecutionId },
    include: { journey: true },
  });

  if (execution.status !== "FULLY_RECEIVED") {
    return { matchCasesApproved: 0, readinessCasesApproved: 0 };
  }

  const matchCases = await prisma.threeWayMatchCase.findMany({
    where: { purchaseOrderExecutionId: execution.id },
    include: { exceptions: true },
  });

  let matchCasesApproved = 0;
  let readinessCasesApproved = 0;

  for (const matchCase of matchCases) {
    const unresolved = matchCase.exceptions.some((exception) =>
      ["OPEN", "INVESTIGATING"].includes(exception.status),
    );

    if (
      !unresolved &&
      ["MATCHED", "MATCHED_WITH_WARNINGS"].includes(matchCase.status)
    ) {
      await approveThreeWayMatchForPayment({
        matchCaseId: matchCase.id,
        actorUserId: input.actorUserId,
      });
      matchCasesApproved += 1;
    }

    const readinessCases = await prisma.apPaymentReadinessCase.findMany({
      where: {
        threeWayMatchCaseId: matchCase.id,
        status: "READY",
      },
      include: { holds: true, checks: true },
    });

    for (const readiness of readinessCases) {
      const blocked =
        readiness.holds.some((hold) => hold.status === "ACTIVE") ||
        readiness.checks.some(
          (check) => check.releaseBlocking && check.status === "FAIL",
        );

      if (!blocked) {
        await approvePaymentReadiness({
          readinessCaseId: readiness.id,
          actorUserId: input.actorUserId,
        });
        readinessCasesApproved += 1;
      }
    }
  }

  if (matchCases.length === 0) {
    await notifyFinanceUsers({
      tenantId: execution.tenantId,
      eventType: "AccountsPayable.MatchRequiredAfterReceipt",
      title: "Goods received — invoice match required",
      message:
        `${execution.orderNumber} is fully received. Associate the supplier invoice so Enorsis can complete invoice matching and payment readiness.`,
      actionUrl: "/app/requisition-to-order/three-way-match",
      correlationId: execution.journey.correlationId,
    });
  } else if (matchCasesApproved > 0 || readinessCasesApproved > 0) {
    await notifyFinanceUsers({
      tenantId: execution.tenantId,
      eventType: "AccountsPayable.GovernedReadinessAdvanced",
      title: "Invoice match and payment readiness advanced",
      message:
        `${execution.orderNumber}: ${matchCasesApproved} match case${matchCasesApproved === 1 ? "" : "s"} approved for payment and ${readinessCasesApproved} payment-readiness case${readinessCasesApproved === 1 ? "" : "s"} approved.`,
      actionUrl: "/app/requisition-to-order/payment-readiness",
      correlationId: execution.journey.correlationId,
    });
  }

  return { matchCasesApproved, readinessCasesApproved };
}

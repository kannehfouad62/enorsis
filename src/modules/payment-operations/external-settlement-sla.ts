import { createEnterpriseNotification } from "@/core/notifications";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { prisma } from "@/lib/prisma";

const settlementPath =
  "/app/requisition-to-order/settlements/external";

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(date: Date, now: Date) {
  return (now.getTime() - date.getTime()) / DAY_MS;
}

async function notificationExists(correlationId: string) {
  return Boolean(
    await prisma.enterpriseNotification.findFirst({
      where: { correlationId },
      select: { id: true },
    }),
  );
}

async function supplierRecipients(input: {
  buyerTenantId: string;
  sellerTenantId?: string | null;
  supplierId: string;
}) {
  const recipients: Array<{
    tenantId: string;
    userId?: string | null;
    email?: string | null;
  }> = [];

  if (input.sellerTenantId) {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId: input.sellerTenantId,
        status: "ACTIVE",
        roles: {
          hasSome: [
            "TENANT_OWNER",
            "TENANT_ADMIN",
            "SUPPLIER_MANAGER",
            "FINANCE",
          ] as never[],
        },
        user: { isActive: true },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    for (const membership of memberships) {
      recipients.push({
        tenantId: input.sellerTenantId,
        userId: membership.user.id,
        email: membership.user.email,
      });
    }
  }

  const portalUsers = await prisma.supplierPortalUser.findMany({
    where: {
      tenantId: input.buyerTenantId,
      supplierId: input.supplierId,
      status: "ACTIVE",
    },
    select: { email: true },
  });

  for (const portalUser of portalUsers) {
    recipients.push({
      tenantId: input.buyerTenantId,
      email: portalUser.email,
    });
  }

  return recipients;
}

async function notifySupplierReminder(input: {
  settlementId: string;
  buyerTenantId: string;
  sellerTenantId?: string | null;
  supplierId: string;
  invoiceNumber: string;
  paymentReference: string | null;
  paymentAmount: string;
  currencyCode: string;
  reminderStage: "DAY_2" | "DAY_4";
}) {
  const correlationId =
    `external-settlement:${input.settlementId}:supplier-reminder:${input.reminderStage}`;

  if (await notificationExists(correlationId)) {
    return false;
  }

  const recipients = await supplierRecipients({
    buyerTenantId: input.buyerTenantId,
    sellerTenantId: input.sellerTenantId,
    supplierId: input.supplierId,
  });

  const title =
    input.reminderStage === "DAY_2"
      ? "Payment receipt confirmation reminder"
      : "Payment confirmation is nearing overdue";

  const message =
    `Buyer recorded external payment ${input.currencyCode} ${input.paymentAmount} for invoice ${input.invoiceNumber}. Reference: ${input.paymentReference ?? "not provided"}. Please confirm receipt or report an issue in Enorsis.`;

  await Promise.allSettled(
    recipients.map((recipient, index) =>
      createEnterpriseNotification({
        tenantId: recipient.tenantId,
        eventType: "PaymentSettlement.SupplierConfirmationReminder",
        recipientUserId: recipient.userId ?? null,
        recipientAddress: recipient.email ?? null,
        title,
        message,
        actionUrl: settlementPath,
        priority:
          input.reminderStage === "DAY_4"
            ? "URGENT"
            : "HIGH",
        channels: recipient.email
          ? ["IN_APP", "EMAIL"]
          : ["IN_APP"],
        correlationId: `${correlationId}:${index}`,
        data: {
          sourceModule: "payment-operations",
          settlementId: input.settlementId,
          reminderStage: input.reminderStage,
        },
      }),
    ),
  );

  return true;
}

async function notifyBuyerOverdue(input: {
  tenantId: string;
  settlementId: string;
  invoiceNumber: string;
  paymentReference: string | null;
}) {
  const baseCorrelationId =
    `external-settlement:${input.settlementId}:buyer-overdue`;

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
        ] as never[],
      },
      user: { isActive: true },
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  await Promise.allSettled(
    memberships.map(async (membership, index) => {
      const correlationId =
        `${baseCorrelationId}:${membership.user.id}:${index}`;

      if (await notificationExists(correlationId)) {
        return;
      }

      await createEnterpriseNotification({
        tenantId: input.tenantId,
        eventType: "PaymentSettlement.ConfirmationOverdue",
        recipientUserId: membership.user.id,
        recipientAddress: membership.user.email,
        title: "Supplier payment confirmation overdue",
        message:
          `Supplier confirmation is overdue for invoice ${input.invoiceNumber}. External payment reference: ${input.paymentReference ?? "not provided"}. The payment remains financially unconfirmed.`,
        actionUrl: settlementPath,
        priority: "URGENT",
        channels: membership.user.email
          ? ["IN_APP", "EMAIL"]
          : ["IN_APP"],
        correlationId,
        data: {
          sourceModule: "payment-operations",
          settlementId: input.settlementId,
        },
      });
    }),
  );
}

export async function processExternalSettlementConfirmationSla({
  limit = 100,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}) {
  const settlements = await prisma.paymentSettlement.findMany({
    where: {
      channel: "EXTERNAL",
      status: "AWAITING_SUPPLIER_CONFIRMATION",
      buyerRecordedAt: { not: null },
    },
    orderBy: { buyerRecordedAt: "asc" },
    take: limit,
  });

  const invoiceIds = [
    ...new Set(
      settlements.map((item) => item.supplierInvoiceId),
    ),
  ];

  const invoices = invoiceIds.length
    ? await prisma.supplierInvoice.findMany({
        where: { id: { in: invoiceIds } },
        select: {
          id: true,
          invoiceNumber: true,
          supplierId: true,
        },
      })
    : [];

  const invoiceById = new Map(
    invoices.map((invoice) => [invoice.id, invoice]),
  );

  let day2Reminders = 0;
  let day4Reminders = 0;
  let overdue = 0;
  let skipped = 0;

  for (const settlement of settlements) {
    const invoice = invoiceById.get(
      settlement.supplierInvoiceId,
    );

    if (!invoice || !settlement.buyerRecordedAt) {
      skipped += 1;
      continue;
    }

    const age = ageDays(settlement.buyerRecordedAt, now);

    if (age >= 5) {
      const changed = await prisma.paymentSettlement.updateMany({
        where: {
          id: settlement.id,
          status: "AWAITING_SUPPLIER_CONFIRMATION",
        },
        data: {
          status: "CONFIRMATION_OVERDUE",
        },
      });

      if (changed.count === 1) {
        overdue += 1;

        await notifyBuyerOverdue({
          tenantId: settlement.tenantId,
          settlementId: settlement.id,
          invoiceNumber: invoice.invoiceNumber,
          paymentReference: settlement.paymentReference,
        });

        await publishDomainEvent({
          tenantId: settlement.tenantId,
          eventType: "PaymentSettlement.ConfirmationOverdue",
          aggregateType: "PaymentSettlement",
          aggregateId: settlement.id,
          sourceModule: "payment-operations",
          payload: {
            invoiceNumber: invoice.invoiceNumber,
            paymentReference: settlement.paymentReference,
            buyerRecordedAt:
              settlement.buyerRecordedAt.toISOString(),
          },
        });

        await recordEnterpriseActivity({
          tenantId: settlement.tenantId,
          activityType:
            "PaymentSettlement.ConfirmationOverdue",
          sourceModule: "payment-operations",
          title: "Supplier confirmation overdue",
          description:
            `External payment confirmation is overdue for invoice ${invoice.invoiceNumber}. The payment remains financially unconfirmed.`,
          severity: "WARNING",
          subjectType: "PaymentSettlement",
          subjectId: settlement.id,
          subjectLabel:
            settlement.paymentReference ?? settlement.id,
          actionUrl: settlementPath,
        });
      }

      continue;
    }

    if (age >= 4) {
      const sent = await notifySupplierReminder({
        settlementId: settlement.id,
        buyerTenantId: settlement.tenantId,
        sellerTenantId: settlement.sellerTenantId,
        supplierId: invoice.supplierId,
        invoiceNumber: invoice.invoiceNumber,
        paymentReference: settlement.paymentReference,
        paymentAmount: settlement.paymentAmount.toString(),
        currencyCode: settlement.currencyCode,
        reminderStage: "DAY_4",
      });
      if (sent) day4Reminders += 1;
      continue;
    }

    if (age >= 2) {
      const sent = await notifySupplierReminder({
        settlementId: settlement.id,
        buyerTenantId: settlement.tenantId,
        sellerTenantId: settlement.sellerTenantId,
        supplierId: invoice.supplierId,
        invoiceNumber: invoice.invoiceNumber,
        paymentReference: settlement.paymentReference,
        paymentAmount: settlement.paymentAmount.toString(),
        currencyCode: settlement.currencyCode,
        reminderStage: "DAY_2",
      });
      if (sent) day2Reminders += 1;
    }
  }

  return {
    scanned: settlements.length,
    day2Reminders,
    day4Reminders,
    overdue,
    skipped,
    processedAt: now.toISOString(),
  };
}

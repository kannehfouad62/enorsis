"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const financeRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

const financeAuthorizationRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
] as const;

const paymentExecutionRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}

async function notifyPaymentOperationUsers({
  tenantId,
  eventType,
  title,
  message,
  priority = "NORMAL",
  targetRoles,
  excludeUserIds = [],
}: {
  tenantId: string;
  eventType: string;
  title: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  targetRoles: readonly string[];
  excludeUserIds?: string[];
}) {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        roles: {
          hasSome: [...targetRoles] as never[],
        },
        ...(excludeUserIds.length
          ? {
              userId: {
                notIn: excludeUserIds,
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await Promise.allSettled(
      memberships.map((membership) =>
        createEnterpriseNotification({
          tenantId,
          eventType,
          recipientUserId: membership.user.id,
          recipientAddress: membership.user.email,
          title,
          message,
          actionUrl: "/app/requisition-to-order/payments",
          priority,
          channels: membership.user.email
            ? ["IN_APP", "EMAIL"]
            : ["IN_APP"],
          data: {
            sourceModule: "payment-operations",
          },
        }),
      ),
    );
  } catch (error) {
    console.error(
      "Payment lifecycle notification fan-out failed",
      {
        tenantId,
        eventType,
        error,
      },
    );
  }
}

async function notifySupplierSettlementRecipients({
  buyerTenantId,
  paymentBatchId,
  batchNumber,
  invoiceIds,
  paymentReference,
}: {
  buyerTenantId: string;
  paymentBatchId: string;
  batchNumber: string;
  invoiceIds: string[];
  paymentReference: string;
}) {
  try {
    const invoices = await prisma.supplierInvoice.findMany({
      where: {
        tenantId: buyerTenantId,
        id: { in: invoiceIds },
        generatedBySellerTenantId: {
          not: null,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        generatedBySellerTenantId: true,
      },
    });

    const bySellerTenant = new Map<
      string,
      string[]
    >();

    for (const invoice of invoices) {
      if (!invoice.generatedBySellerTenantId) continue;

      const current =
        bySellerTenant.get(
          invoice.generatedBySellerTenantId,
        ) ?? [];

      current.push(invoice.invoiceNumber);
      bySellerTenant.set(
        invoice.generatedBySellerTenantId,
        current,
      );
    }

    for (const [sellerTenantId, invoiceNumbers] of bySellerTenant) {
      const memberships = await prisma.membership.findMany({
        where: {
          tenantId: sellerTenantId,
          status: "ACTIVE",
          roles: {
            hasSome: [
              "TENANT_OWNER",
              "TENANT_ADMIN",
              "SUPPLIER_MANAGER",
              "FINANCE",
            ] as never[],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      await Promise.allSettled(
        memberships.map((membership) =>
          createEnterpriseNotification({
            tenantId: sellerTenantId,
            eventType: "SupplierPayment.Settled",
            recipientUserId: membership.user.id,
            recipientAddress: membership.user.email,
            title: "Buyer payment has settled",
            message:
              `Payment run ${batchNumber} has settled for invoice${invoiceNumbers.length === 1 ? "" : "s"} ${invoiceNumbers.join(", ")}. Payment reference: ${paymentReference}.`,
            actionUrl:
              `/app/marketplace/remittances/${paymentBatchId}`,
            priority: "NORMAL",
            channels: membership.user.email
              ? ["IN_APP", "EMAIL"]
              : ["IN_APP"],
            data: {
              sourceModule: "supplier-finance",
              paymentBatchId,
              invoiceNumbers,
            },
          }),
        ),
      );
    }
  } catch (error) {
    console.error(
      "Supplier settlement notification fan-out failed",
      {
        buyerTenantId,
        paymentBatchId,
        invoiceIds,
        error,
      },
    );
  }
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
        submittedByUserId: user.id,
        submittedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        "The payment run changed while it was being submitted. Refresh and try again.",
      );
    }

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.AuthorizationRequired",
      title: "Payment run requires authorization",
      message:
        `Payment run ${batch.batchNumber} is awaiting finance authorization.`,
      priority: "HIGH",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
      ],
      excludeUserIds: [user.id],
    });

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

export async function authorizePaymentRunAction(
  data: FormData,
) {
  const user = await requireAnyRole(
    [...financeAuthorizationRoles],
  );

  const paymentBatchId = field(data, "paymentBatchId");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const [batch, membership] = await Promise.all([
      prisma.paymentBatch.findFirst({
        where: {
          id: paymentBatchId,
          tenantId: user.tenantId,
          status: "PENDING_APPROVAL",
        },
        include: {
          items: true,
        },
      }),
      prisma.membership.findUnique({
        where: {
          tenantId_userId: {
            tenantId: user.tenantId,
            userId: user.id,
          },
        },
        select: {
          approvalLimitUsd: true,
          status: true,
          roles: true,
        },
      }),
    ]);

    if (!batch) {
      throw new Error(
        "This payment run is no longer awaiting authorization or is not available to your organization.",
      );
    }

    if (!membership || membership.status !== "ACTIVE") {
      throw new Error(
        "Your active tenant membership could not be verified for payment authorization.",
      );
    }

    if (batch.createdByUserId === user.id) {
      throw new Error(
        "Segregation of duties prevents the payment-run creator from authorizing the same run.",
      );
    }

    const totalUsd = Number(batch.totalUsdEquivalent);

    if (
      membership.approvalLimitUsd !== null &&
      totalUsd > Number(membership.approvalLimitUsd)
    ) {
      throw new Error(
        `This payment run exceeds your approval limit of USD ${Number(
          membership.approvalLimitUsd,
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`,
      );
    }

    const includedItems = batch.items.filter(
      (item) => item.status === "INCLUDED",
    );

    if (includedItems.length === 0) {
      throw new Error(
        "This payment run has no included invoices and cannot be authorized.",
      );
    }

    const itemTotal = includedItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    if (
      Math.abs(itemTotal - Number(batch.totalAmount)) >
      0.005
    ) {
      throw new Error(
        "The payment run total no longer matches its included invoices. Review the run before authorization.",
      );
    }

    const updated = await prisma.paymentBatch.updateMany({
      where: {
        id: batch.id,
        tenantId: user.tenantId,
        status: "PENDING_APPROVAL",
      },
      data: {
        status: "APPROVED",
        approvedByUserId: user.id,
        approvedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        "The payment run changed while authorization was being recorded. Refresh and try again.",
      );
    }

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.ExecutionRequired",
      title: "Authorized payment run is ready to execute",
      message:
        `Payment run ${batch.batchNumber} has been authorized and is ready for payment execution.`,
      priority: "HIGH",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ],
      excludeUserIds: [user.id],
    });

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-runs");
  } catch (error) {
    console.error("Payment run authorization failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment run could not be authorized.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} authorized successfully.`,
    ),
  );
}

export async function executePaymentRunAction(
  data: FormData,
) {
  const user = await requireAnyRole(
    [...paymentExecutionRoles],
  );

  const paymentBatchId = field(data, "paymentBatchId");
  const paymentReference = field(
    data,
    "paymentReference",
  );

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (paymentReference.length < 4) {
      throw new Error(
        "Enter a valid bank or payment execution reference.",
      );
    }

    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: "APPROVED",
      },
      include: {
        items: true,
      },
    });

    if (!batch) {
      throw new Error(
        "This payment run is no longer authorized for execution or is not available to your organization.",
      );
    }

    if (!batch.approvedByUserId) {
      throw new Error(
        "This payment run is missing authorization audit metadata and cannot be executed.",
      );
    }

    if (batch.approvedByUserId === user.id) {
      throw new Error(
        "Segregation of duties prevents the payment authorizer from executing the same payment run.",
      );
    }

    const includedItems = batch.items.filter(
      (item) => item.status === "INCLUDED",
    );

    if (
      includedItems.length !== batch.items.length ||
      includedItems.length === 0
    ) {
      throw new Error(
        "All payment-run items must be included and ready before execution.",
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const updatedBatch =
        await tx.paymentBatch.updateMany({
          where: {
            id: batch.id,
            tenantId: user.tenantId,
            status: "APPROVED",
          },
          data: {
            status: "PROCESSING",
            exportedByUserId: user.id,
            exportedAt: now,
            exportReference: paymentReference,
          },
        });

      if (updatedBatch.count !== 1) {
        throw new Error(
          "The payment run changed while execution was being recorded. Refresh and try again.",
        );
      }

      const updatedItems =
        await tx.paymentBatchItem.updateMany({
          where: {
            paymentBatchId: batch.id,
            status: "INCLUDED",
          },
          data: {
            paymentReference,
          },
        });

      if (updatedItems.count !== includedItems.length) {
        throw new Error(
          "Not all payment items could be marked with the execution reference.",
        );
      }
    });

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.SettlementRequired",
      title: "Payment run is awaiting settlement confirmation",
      message:
        `Payment run ${batch.batchNumber} was executed with reference ${paymentReference} and now requires settlement confirmation.`,
      priority: "HIGH",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ],
      excludeUserIds: [user.id],
    });

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-runs");
    revalidatePath("/app/requisition-to-order/settlements");
  } catch (error) {
    console.error("Payment run execution failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      paymentReference,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment run could not be executed.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} sent to payment processing with reference ${paymentReference}.`,
    ),
  );
}

export async function settlePaymentRunAction(
  data: FormData,
) {
  const user = await requireAnyRole(
    [...paymentExecutionRoles],
  );

  const paymentBatchId = field(data, "paymentBatchId");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: "PROCESSING",
      },
      include: {
        items: true,
      },
    });

    if (!batch) {
      throw new Error(
        "This payment run is no longer awaiting settlement or is not available to your organization.",
      );
    }

    if (!batch.exportedByUserId || !batch.exportReference) {
      throw new Error(
        "This payment run is missing execution audit information and cannot be settled.",
      );
    }

    if (batch.exportedByUserId === user.id) {
      throw new Error(
        "Segregation of duties prevents the payment executor from settling the same payment run.",
      );
    }

    const payableItems = batch.items.filter(
      (item) => item.status === "INCLUDED",
    );

    if (
      payableItems.length !== batch.items.length ||
      payableItems.length === 0
    ) {
      throw new Error(
        "All payment-run items must still be awaiting settlement before completion.",
      );
    }

    const invoiceIds = [
      ...new Set(
        payableItems.map(
          (item) => item.supplierInvoiceId,
        ),
      ),
    ];

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const updatedBatch =
        await tx.paymentBatch.updateMany({
          where: {
            id: batch.id,
            tenantId: user.tenantId,
            status: "PROCESSING",
          },
          data: {
            status: "COMPLETED",
            completedByUserId: user.id,
            completedAt: now,
          },
        });

      if (updatedBatch.count !== 1) {
        throw new Error(
          "The payment run changed while settlement was being recorded. Refresh and try again.",
        );
      }

      const updatedItems =
        await tx.paymentBatchItem.updateMany({
          where: {
            paymentBatchId: batch.id,
            status: "INCLUDED",
          },
          data: {
            status: "PAID",
            paidAt: now,
          },
        });

      if (updatedItems.count !== payableItems.length) {
        throw new Error(
          "Not all payment items could be marked as paid.",
        );
      }

      const updatedInvoices =
        await tx.supplierInvoice.updateMany({
          where: {
            tenantId: user.tenantId,
            id: { in: invoiceIds },
          },
          data: {
            status: "PAID",
            paidAt: now,
            paymentReference:
              batch.exportReference,
          },
        });

      if (updatedInvoices.count !== invoiceIds.length) {
        throw new Error(
          "Not all supplier invoices could be marked as paid.",
        );
      }

      const updatedReadiness =
        await tx.apPaymentReadinessCase.updateMany({
          where: {
            tenantId: user.tenantId,
            paymentBatchId: batch.id,
            status: "BATCHED",
          },
          data: {
            status: "PAID",
          },
        });

      if (
        updatedReadiness.count !== invoiceIds.length
      ) {
        throw new Error(
          "The linked payment-readiness records could not all be closed as paid.",
        );
      }
    });

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.Settled",
      title: "Payment run settled successfully",
      message:
        `Payment run ${batch.batchNumber} has settled successfully. Linked supplier invoices are now paid.`,
      priority: "NORMAL",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ],
    });

    await notifySupplierSettlementRecipients({
      buyerTenantId: user.tenantId,
      paymentBatchId: batch.id,
      batchNumber: batch.batchNumber,
      invoiceIds,
      paymentReference: batch.exportReference,
    });

    revalidatePath(
      "/app/requisition-to-order/payments",
    );
    revalidatePath(
      "/app/requisition-to-order/payment-runs",
    );
    revalidatePath(
      "/app/requisition-to-order/settlements",
    );
    revalidatePath(
      "/app/requisition-to-order/payment-readiness",
    );
    revalidatePath(
      "/app/marketplace/invoices",
    );
    revalidatePath(
      "/app/purchasing/invoices",
    );
  } catch (error) {
    console.error("Payment settlement failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment run could not be settled.";
  }

  if (errorMessage) {
    redirect(
      paymentPath(undefined, errorMessage),
    );
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} settled successfully. Linked invoices are now paid.`,
    ),
  );
}

export async function cancelPaymentRunAction(
  data: FormData,
) {
  const user = await requireAnyRole([...paymentExecutionRoles]);

  const paymentBatchId = field(data, "paymentBatchId");
  const reasonCode = field(data, "reasonCode");
  const reason = field(data, "reason");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (!reasonCode || reason.length < 5) {
      throw new Error(
        "Select a cancellation reason and provide a short explanation.",
      );
    }

    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: {
          in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"],
        },
      },
      include: {
        items: true,
      },
    });

    if (!batch) {
      throw new Error(
        "Only draft, awaiting-authorization, or authorized payment runs can be cancelled before execution.",
      );
    }

    const note =
      `[CANCELLED:${reasonCode}] ${reason}`;
    const description = [
      batch.description,
      note,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.$transaction(async (tx) => {
      const updatedBatch =
        await tx.paymentBatch.updateMany({
          where: {
            id: batch.id,
            tenantId: user.tenantId,
            status: batch.status,
          },
          data: {
            status: "CANCELLED",
            description,
          },
        });

      if (updatedBatch.count !== 1) {
        throw new Error(
          "The payment run changed while cancellation was being recorded. Refresh and try again.",
        );
      }

      await tx.paymentBatchItem.updateMany({
        where: {
          paymentBatchId: batch.id,
          status: {
            in: ["PENDING", "INCLUDED"],
          },
        },
        data: {
          status: "REJECTED",
        },
      });

      await tx.apPaymentReadinessCase.updateMany({
        where: {
          tenantId: user.tenantId,
          paymentBatchId: batch.id,
          status: "BATCHED",
        },
        data: {
          status: "APPROVED",
          paymentBatchId: null,
          batchedAt: null,
        },
      });
    });

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.Cancelled",
      title: "Payment run cancelled",
      message:
        `Payment run ${batch.batchNumber} was cancelled before execution. Reason: ${reasonCode} — ${reason}`,
      priority: "HIGH",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ],
    });

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");
  } catch (error) {
    console.error("Payment run cancellation failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      reasonCode,
      reason,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment run could not be cancelled.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} cancelled. Its readiness cases are available for re-batching.`,
    ),
  );
}


export async function recordPaymentExecutionFailureAction(
  data: FormData,
) {
  const user = await requireAnyRole([...paymentExecutionRoles]);

  const paymentBatchId = field(data, "paymentBatchId");
  const reasonCode = field(data, "reasonCode");
  const reason = field(data, "reason");

  let batchNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (!reasonCode || reason.length < 5) {
      throw new Error(
        "Select a failure reason and provide a short explanation.",
      );
    }

    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: "PROCESSING",
      },
      include: {
        items: true,
      },
    });

    if (!batch) {
      throw new Error(
        "Only a payment run currently in processing can be recorded as failed.",
      );
    }

    const note =
      `[EXECUTION_FAILED:${reasonCode}] ${reason}`;
    const description = [
      batch.description,
      note,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.$transaction(async (tx) => {
      const updatedBatch =
        await tx.paymentBatch.updateMany({
          where: {
            id: batch.id,
            tenantId: user.tenantId,
            status: "PROCESSING",
          },
          data: {
            status: "CANCELLED",
            description,
          },
        });

      if (updatedBatch.count !== 1) {
        throw new Error(
          "The payment run changed while the failure was being recorded. Refresh and try again.",
        );
      }

      const failedItems =
        await tx.paymentBatchItem.updateMany({
          where: {
            paymentBatchId: batch.id,
            status: "INCLUDED",
          },
          data: {
            status: "FAILED",
          },
        });

      if (failedItems.count !== batch.items.length) {
        throw new Error(
          "Not all payment items could be marked as failed.",
        );
      }

      await tx.apPaymentReadinessCase.updateMany({
        where: {
          tenantId: user.tenantId,
          paymentBatchId: batch.id,
          status: "BATCHED",
        },
        data: {
          status: "APPROVED",
          paymentBatchId: null,
          batchedAt: null,
        },
      });
    });

    batchNumber = batch.batchNumber;

    await notifyPaymentOperationUsers({
      tenantId: user.tenantId,
      eventType: "PaymentRun.ExecutionFailed",
      title: "Payment execution failed",
      message:
        `Payment run ${batch.batchNumber} failed during execution. Reason: ${reasonCode} — ${reason}. The affected readiness cases are available for controlled retry.`,
      priority: "URGENT",
      targetRoles: [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "ACCOUNTS_PAYABLE",
      ],
    });

    revalidatePath("/app/requisition-to-order/payments");
    revalidatePath("/app/requisition-to-order/payment-readiness");
  } catch (error) {
    console.error("Payment execution failure recording failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      reasonCode,
      reason,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The payment execution failure could not be recorded.";
  }

  if (errorMessage) {
    redirect(paymentPath(undefined, errorMessage));
  }

  redirect(
    paymentPath(
      `Payment run ${batchNumber ?? ""} recorded as failed. The affected invoices can be re-batched after correction.`,
    ),
  );
}


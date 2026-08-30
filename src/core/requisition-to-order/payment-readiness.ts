import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function assessPaymentReadiness(input: {
  threeWayMatchCaseId: string;
  supplierInvoiceId: string;
  invoiceNumber?: string | null;
  supplierId?: string | null;
  dueDate?: Date | null;
  discountDate?: Date | null;
  discountAmount?: number | null;
  bankDetailsVerified: boolean;
  supplierCompliant: boolean;
  taxValidated: boolean;
  duplicateInvoiceDetected: boolean;
  actorUserId: string;
}) {
  const matchCase = await prisma.threeWayMatchCase.findUniqueOrThrow({
    where: { id: input.threeWayMatchCaseId },
    include: {
      exceptions: true,
      purchaseOrderExecution: { include: { journey: true } },
    },
  });

  if (matchCase.status !== "APPROVED_FOR_PAYMENT") {
    throw new Error("Three-way match must be approved for payment first.");
  }

  const invoice = await prisma.supplierInvoice.findFirst({
    where: {
      id: matchCase.supplierInvoiceId,
      tenantId: matchCase.tenantId,
    },
  });

  if (!invoice) {
    throw new Error(
      "The approved three-way match is not linked to a valid supplier invoice.",
    );
  }

  const unresolvedMatchExceptions = matchCase.exceptions.some((item) =>
    ["OPEN", "INVESTIGATING"].includes(item.status),
  );

  const checks = [
    ["match.approved", "Three-way match approved", "PASS", true, matchCase.status, "APPROVED_FOR_PAYMENT", null],
    ["match.exceptions", "No unresolved match exceptions", unresolvedMatchExceptions ? "FAIL" : "PASS", true, unresolvedMatchExceptions ? "UNRESOLVED" : "CLEAR", "CLEAR", unresolvedMatchExceptions ? "Resolve or waive all match exceptions." : null],
    ["invoice.duplicate", "Duplicate invoice screening", input.duplicateInvoiceDetected ? "FAIL" : "PASS", true, input.duplicateInvoiceDetected ? "DUPLICATE" : "UNIQUE", "UNIQUE", input.duplicateInvoiceDetected ? "Investigate the potential duplicate invoice." : null],
    ["supplier.compliance", "Supplier compliance", input.supplierCompliant ? "PASS" : "FAIL", true, input.supplierCompliant ? "COMPLIANT" : "NON_COMPLIANT", "COMPLIANT", input.supplierCompliant ? null : "Resolve supplier compliance restrictions."],
    ["banking.verified", "Supplier banking details verified", input.bankDetailsVerified ? "PASS" : "FAIL", true, input.bankDetailsVerified ? "VERIFIED" : "UNVERIFIED", "VERIFIED", input.bankDetailsVerified ? null : "Complete independent supplier banking verification."],
    ["tax.validated", "Tax treatment validated", input.taxValidated ? "PASS" : "WARN", false, input.taxValidated ? "VALIDATED" : "PENDING", "VALIDATED", input.taxValidated ? null : "Complete tax validation before batching."],
    ["payment.due-date", "Payment due date available", input.dueDate ? "PASS" : "WARN", false, input.dueDate?.toISOString() ?? "MISSING", "AVAILABLE", input.dueDate ? null : "Calculate due date from approved payment terms."],
  ] as const;

  const blocked = checks.some(
    ([, , status, releaseBlocking]) =>
      status === "FAIL" && releaseBlocking,
  );

  const count = await prisma.apPaymentReadinessCase.count({
    where: { tenantId: matchCase.tenantId },
  });
  const readinessNumber = `APR-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const holds = [
    ...(input.duplicateInvoiceDetected ? [{ holdType: "DUPLICATE_INVOICE" as const, title: "Potential duplicate invoice" }] : []),
    ...(!input.bankDetailsVerified ? [{ holdType: "BANKING_REVIEW" as const, title: "Banking verification required" }] : []),
    ...(!input.supplierCompliant ? [{ holdType: "SUPPLIER_COMPLIANCE" as const, title: "Supplier compliance hold" }] : []),
    ...(unresolvedMatchExceptions ? [{ holdType: "MATCH_EXCEPTION" as const, title: "Three-way-match exception hold" }] : []),
  ];

  const readinessCase = await prisma.apPaymentReadinessCase.create({
    data: {
      tenantId: matchCase.tenantId,
      threeWayMatchCaseId: matchCase.id,
      supplierInvoiceId: invoice.id,
      readinessNumber,
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      currencyCode: matchCase.currencyCode,
      invoiceAmount: matchCase.invoiceAmount,
      dueDate: input.dueDate ?? invoice.dueDate ?? null,
      discountDate: input.discountDate ?? null,
      discountAmount: input.discountAmount ?? null,
      status: blocked ? "BLOCKED" : "READY",
      createdByUserId: input.actorUserId,
      checks: {
        create: checks.map(([key, name, status, releaseBlocking, observedValue, expectedValue, remediation]) => ({
          key,
          name,
          status,
          releaseBlocking,
          observedValue,
          expectedValue,
          remediation: remediation ?? undefined,
          evidence: toJson({}),
        })),
      },
      holds: holds.length
        ? { create: holds.map((hold) => ({ ...hold, ownerUserId: input.actorUserId })) }
        : undefined,
    },
    include: { checks: true, holds: true },
  });

  await publishDomainEvent({
    tenantId: matchCase.tenantId,
    eventType: "AccountsPayable.PaymentReadinessAssessed",
    aggregateType: "ApPaymentReadinessCase",
    aggregateId: readinessCase.id,
    sourceModule: "requisition-to-order",
    correlationId: matchCase.purchaseOrderExecution.journey.correlationId,
    actorUserId: input.actorUserId,
    payload: {
      readinessCaseId: readinessCase.id,
      readinessNumber,
      status: readinessCase.status,
    },
  });

  await recordEnterpriseActivity({
    tenantId: matchCase.tenantId,
    activityType: "AccountsPayable.PaymentReadinessAssessed",
    sourceModule: "requisition-to-order",
    title: "Payment readiness assessed",
    description: `${readinessNumber} — ${readinessCase.status}`,
    severity: blocked ? "WARNING" : "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ApPaymentReadinessCase",
    subjectId: readinessCase.id,
    subjectLabel: readinessNumber,
    actionUrl: "/app/requisition-to-order/payment-readiness",
    correlationId: matchCase.purchaseOrderExecution.journey.correlationId,
  });

  return readinessCase;
}

export async function releasePaymentHold(input: {
  holdId: string;
  releaseReason: string;
  actorUserId: string;
}) {
  const hold = await prisma.apPaymentHold.findUniqueOrThrow({
    where: { id: input.holdId },
  });

  const updated = await prisma.apPaymentHold.update({
    where: { id: input.holdId },
    data: {
      status: "RELEASED",
      releasedByUserId: input.actorUserId,
      releasedAt: new Date(),
      releaseReason: input.releaseReason,
    },
  });

  const [activeHolds, blockingFailures] = await Promise.all([
    prisma.apPaymentHold.count({
      where: {
        readinessCaseId: hold.readinessCaseId,
        status: "ACTIVE",
      },
    }),
    prisma.apPaymentReadinessCheck.count({
      where: {
        readinessCaseId: hold.readinessCaseId,
        status: "FAIL",
        releaseBlocking: true,
      },
    }),
  ]);

  await prisma.apPaymentReadinessCase.update({
    where: { id: hold.readinessCaseId },
    data: {
      status:
        activeHolds === 0 && blockingFailures === 0
          ? "READY"
          : "BLOCKED",
    },
  });

  return updated;
}

export async function reconcilePaymentReadinessCase(
  readinessCaseId: string,
) {
  const readinessCase =
    await prisma.apPaymentReadinessCase.findUniqueOrThrow({
      where: { id: readinessCaseId },
      include: { holds: true, checks: true },
    });

  const activeHolds = readinessCase.holds.some(
    (hold) => hold.status === "ACTIVE",
  );
  const blockingFailure = readinessCase.checks.some(
    (check) =>
      check.status === "FAIL" && check.releaseBlocking,
  );

  const nextStatus =
    activeHolds || blockingFailure ? "BLOCKED" : "READY";

  if (
    readinessCase.status !== "APPROVED" &&
    readinessCase.status !== "BATCHED" &&
    readinessCase.status !== nextStatus
  ) {
    return prisma.apPaymentReadinessCase.update({
      where: { id: readinessCaseId },
      data: { status: nextStatus },
      include: { holds: true, checks: true },
    });
  }

  return readinessCase;
}

export async function approvePaymentReadiness(input: {
  readinessCaseId: string;
  actorUserId: string;
}) {
  const readinessCase =
    await reconcilePaymentReadinessCase(
      input.readinessCaseId,
    );

  const activeHolds = readinessCase.holds.some(
    (hold) => hold.status === "ACTIVE",
  );
  const blockingFailure = readinessCase.checks.some(
    (check) =>
      check.status === "FAIL" && check.releaseBlocking,
  );

  if (
    readinessCase.status !== "READY" ||
    activeHolds ||
    blockingFailure
  ) {
    const reasons = [
      activeHolds ? "one or more payment holds are active" : null,
      blockingFailure
        ? "one or more release-blocking readiness checks still fail"
        : null,
    ].filter(Boolean);

    throw new Error(
      `Payment readiness is still blocked: ${reasons.join(
        "; ",
      )}.`,
    );
  }

  return prisma.apPaymentReadinessCase.update({
    where: { id: input.readinessCaseId },
    data: {
      status: "APPROVED",
      approvedByUserId: input.actorUserId,
      approvedAt: new Date(),
    },
  });
}

export async function assignPaymentBatch(input: {
  readinessCaseId: string;
  paymentBatchId: string;
  actorUserId: string;
}) {
  const readinessCase = await prisma.apPaymentReadinessCase.findUniqueOrThrow({
    where: { id: input.readinessCaseId },
  });

  if (readinessCase.status !== "APPROVED") {
    throw new Error("Only approved cases can be assigned to a payment batch.");
  }

  return prisma.apPaymentReadinessCase.update({
    where: { id: input.readinessCaseId },
    data: {
      status: "BATCHED",
      paymentBatchId: input.paymentBatchId,
      batchedAt: new Date(),
    },
  });
}

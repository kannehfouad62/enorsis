import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

export async function runProcurementProcessCertification(input: {
  journeyId: string;
  actorUserId: string;
}) {
  const journey = await prisma.requisitionOrderJourney.findUniqueOrThrow({
    where: { id: input.journeyId },
    include: {
      submissionAssessments: {
        include: { checks: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      approvalRoutes: {
        include: {
          steps: {
            include: { decisions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      purchaseOrderExecutions: {
        include: {
          validations: true,
          goodsReceiptSessions: {
            include: { exceptions: true },
          },
          threeWayMatchCases: {
            include: {
              exceptions: true,
              paymentReadinessCase: {
                include: {
                  checks: true,
                  holds: true,
                },
              },
            },
          },
        },
      },
      exceptions: true,
    },
  });

  const count = await prisma.procurementProcessCertification.count({
    where: { tenantId: journey.tenantId },
  });

  const certificationNumber = `RPC-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const checks: Array<{
    key: string;
    category: string;
    name: string;
    status: "PASS" | "WARN" | "FAIL" | "SKIPPED";
    severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    releaseBlocking: boolean;
    observedValue?: string;
    expectedValue?: string;
    remediation?: string;
  }> = [];

  const assessment = journey.submissionAssessments[0];
  checks.push({
    key: "requisition.submission",
    category: "Requisition",
    name: "Purchase request submission completed",
    status: assessment?.status === "SUBMITTED" ? "PASS" : "FAIL",
    severity: assessment?.status === "SUBMITTED" ? "INFO" : "CRITICAL",
    releaseBlocking: true,
    observedValue: assessment?.status ?? "MISSING",
    expectedValue: "SUBMITTED",
    remediation:
      assessment?.status === "SUBMITTED"
        ? undefined
        : "Complete purchase request readiness and submission.",
  });

  const approvalRoute = journey.approvalRoutes[0];
  checks.push({
    key: "approval.completed",
    category: "Approval",
    name: "Approval route completed",
    status: approvalRoute?.status === "APPROVED" ? "PASS" : "FAIL",
    severity: approvalRoute?.status === "APPROVED" ? "INFO" : "CRITICAL",
    releaseBlocking: true,
    observedValue: approvalRoute?.status ?? "MISSING",
    expectedValue: "APPROVED",
    remediation:
      approvalRoute?.status === "APPROVED"
        ? undefined
        : "Complete and approve the requisition approval route.",
  });

  const orders = journey.purchaseOrderExecutions;
  checks.push({
    key: "purchase-order.exists",
    category: "Purchase Order",
    name: "Purchase order exists",
    status: orders.length > 0 ? "PASS" : "FAIL",
    severity: orders.length > 0 ? "INFO" : "CRITICAL",
    releaseBlocking: true,
    observedValue: String(orders.length),
    expectedValue: "At least 1",
    remediation:
      orders.length > 0
        ? undefined
        : "Generate an approved purchase order.",
  });

  const invalidOrders = orders.filter((order) =>
    ["DRAFT", "VALIDATION_FAILED", "READY_TO_ISSUE"].includes(order.status),
  );
  checks.push({
    key: "purchase-order.issued",
    category: "Purchase Order",
    name: "All purchase orders issued",
    status:
      orders.length > 0 && invalidOrders.length === 0 ? "PASS" : "FAIL",
    severity:
      orders.length > 0 && invalidOrders.length === 0 ? "INFO" : "HIGH",
    releaseBlocking: true,
    observedValue: `${orders.length - invalidOrders.length}/${orders.length}`,
    expectedValue: `${orders.length}/${orders.length}`,
    remediation:
      invalidOrders.length === 0
        ? undefined
        : "Issue or cancel all draft/unvalidated purchase orders.",
  });

  const receipts = orders.flatMap((order) => order.goodsReceiptSessions);
  const openReceiptExceptions = receipts.flatMap((receipt) =>
    receipt.exceptions.filter((item) =>
      ["OPEN", "INVESTIGATING"].includes(item.status),
    ),
  );
  checks.push({
    key: "receipt.exceptions",
    category: "Receipt",
    name: "No unresolved receipt exceptions",
    status: openReceiptExceptions.length === 0 ? "PASS" : "FAIL",
    severity: openReceiptExceptions.length === 0 ? "INFO" : "HIGH",
    releaseBlocking: true,
    observedValue: String(openReceiptExceptions.length),
    expectedValue: "0",
    remediation:
      openReceiptExceptions.length === 0
        ? undefined
        : "Resolve all receipt exceptions.",
  });

  const matches = orders.flatMap((order) => order.threeWayMatchCases);
  const unmatched = matches.filter(
    (item) => item.status !== "APPROVED_FOR_PAYMENT",
  );
  checks.push({
    key: "three-way-match.approved",
    category: "Invoice Match",
    name: "All match cases approved for payment",
    status: matches.length > 0 && unmatched.length === 0 ? "PASS" : "FAIL",
    severity: matches.length > 0 && unmatched.length === 0 ? "INFO" : "HIGH",
    releaseBlocking: true,
    observedValue: `${matches.length - unmatched.length}/${matches.length}`,
    expectedValue: `${matches.length}/${matches.length}`,
    remediation:
      matches.length > 0 && unmatched.length === 0
        ? undefined
        : "Resolve matching exceptions and approve invoices for payment.",
  });

  const readinessCases = matches
    .map((item) => item.paymentReadinessCase)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const blockedReadiness = readinessCases.filter((item) =>
    ["DRAFT", "BLOCKED"].includes(item.status),
  );
  checks.push({
    key: "payment-readiness.complete",
    category: "Accounts Payable",
    name: "Payment readiness completed",
    status:
      readinessCases.length > 0 && blockedReadiness.length === 0
        ? "PASS"
        : "FAIL",
    severity:
      readinessCases.length > 0 && blockedReadiness.length === 0
        ? "INFO"
        : "HIGH",
    releaseBlocking: true,
    observedValue: `${readinessCases.length - blockedReadiness.length}/${readinessCases.length}`,
    expectedValue: `${readinessCases.length}/${readinessCases.length}`,
    remediation:
      readinessCases.length > 0 && blockedReadiness.length === 0
        ? undefined
        : "Complete AP readiness checks and clear blockers.",
  });

  const activeHolds = readinessCases.flatMap((item) =>
    item.holds.filter((hold) => hold.status === "ACTIVE"),
  );
  checks.push({
    key: "payment.holds",
    category: "Accounts Payable",
    name: "No active payment holds",
    status: activeHolds.length === 0 ? "PASS" : "FAIL",
    severity: activeHolds.length === 0 ? "INFO" : "CRITICAL",
    releaseBlocking: true,
    observedValue: String(activeHolds.length),
    expectedValue: "0",
    remediation:
      activeHolds.length === 0
        ? undefined
        : "Release or resolve all payment holds.",
  });

  const openJourneyExceptions = journey.exceptions.filter((item) =>
    ["OPEN", "INVESTIGATING"].includes(item.status),
  );
  checks.push({
    key: "journey.exceptions",
    category: "Journey",
    name: "No unresolved journey exceptions",
    status: openJourneyExceptions.length === 0 ? "PASS" : "FAIL",
    severity: openJourneyExceptions.length === 0 ? "INFO" : "HIGH",
    releaseBlocking: true,
    observedValue: String(openJourneyExceptions.length),
    expectedValue: "0",
    remediation:
      openJourneyExceptions.length === 0
        ? undefined
        : "Resolve all requisition-to-order journey exceptions.",
  });

  const closureState = ["RECEIVED", "CLOSED"].includes(journey.status);
  checks.push({
    key: "journey.received-or-closed",
    category: "Journey",
    name: "Journey reached receipt or closure state",
    status: closureState ? "PASS" : "WARN",
    severity: closureState ? "INFO" : "MEDIUM",
    releaseBlocking: false,
    observedValue: journey.status,
    expectedValue: "RECEIVED or CLOSED",
    remediation:
      closureState
        ? undefined
        : "Complete remaining operational steps before final closure.",
  });

  const releaseBlocked = checks.some(
    (item) => item.status === "FAIL" && item.releaseBlocking,
  );
  const failed = checks.filter((item) => item.status === "FAIL");
  const warnings = checks.filter((item) => item.status === "WARN");

  const status =
    releaseBlocked
      ? "FAILED"
      : warnings.length > 0 || failed.length > 0
        ? "PASSED_WITH_WARNINGS"
        : "PASSED";

  const certification = await prisma.procurementProcessCertification.create({
    data: {
      tenantId: journey.tenantId,
      journeyId: journey.id,
      certificationNumber,
      status,
      releaseBlocked,
      startedAt: new Date(),
      completedAt: new Date(),
      initiatedByUserId: input.actorUserId,
      summary: toJson({
        total: checks.length,
        passed: checks.filter((item) => item.status === "PASS").length,
        warnings: warnings.length,
        failed: failed.length,
        releaseBlocked,
      }),
      checks: {
        create: checks.map((item) => ({
          key: item.key,
          category: item.category,
          name: item.name,
          status: item.status,
          severity: item.severity,
          releaseBlocking: item.releaseBlocking,
          observedValue: item.observedValue ?? null,
          expectedValue: item.expectedValue ?? null,
          remediation: item.remediation ?? null,
          evidence: toJson({}),
        })),
      },
    },
    include: { checks: true },
  });

  await publishDomainEvent({
    tenantId: journey.tenantId,
    eventType: "ProcurementProcess.CertificationCompleted",
    aggregateType: "ProcurementProcessCertification",
    aggregateId: certification.id,
    sourceModule: "requisition-to-order",
    correlationId: journey.correlationId,
    actorUserId: input.actorUserId,
    payload: {
      certificationId: certification.id,
      certificationNumber,
      status,
      releaseBlocked,
    },
  });

  return certification;
}

export async function certifyProcurementProcess(input: {
  certificationId: string;
  actorUserId: string;
}) {
  const certification =
    await prisma.procurementProcessCertification.findUniqueOrThrow({
      where: { id: input.certificationId },
      include: { journey: true },
    });

  if (certification.releaseBlocked || certification.status === "FAILED") {
    throw new Error(
      "Procurement process certification is blocked by unresolved findings.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const certified = await tx.procurementProcessCertification.update({
      where: { id: input.certificationId },
      data: {
        status: "CERTIFIED",
        certifiedAt: new Date(),
        certifiedByUserId: input.actorUserId,
      },
    });

    if (certification.journey.status === "RECEIVED") {
      await tx.requisitionOrderJourney.update({
        where: { id: certification.journeyId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          milestones: {
            create: {
              milestoneType: "JOURNEY_CLOSED",
              title: "Procurement journey certified and closed",
              actorUserId: input.actorUserId,
              sourceModule: "requisition-to-order",
              sourceRecordId: certification.id,
            },
          },
        },
      });
    }

    return certified;
  });

  await recordEnterpriseActivity({
    tenantId: certification.tenantId,
    activityType: "ProcurementProcess.Certified",
    sourceModule: "requisition-to-order",
    title: "Procurement process certified",
    description: certification.certificationNumber,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ProcurementProcessCertification",
    subjectId: certification.id,
    subjectLabel: certification.certificationNumber,
    actionUrl: "/app/requisition-to-order/certification",
    correlationId: certification.journey.correlationId,
  });

  return updated;
}

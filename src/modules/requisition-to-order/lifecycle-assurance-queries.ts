import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const terminalStatuses = new Set(["CLOSED", "CANCELLED"]);
const approvalStatuses = new Set(["REQUISITION_SUBMITTED", "APPROVAL_PENDING"]);
const orderStatuses = new Set([
  "APPROVED",
  "ORDER_PENDING",
  "ORDER_ISSUED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
]);
const receiptStatuses = new Set([
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
]);

export async function getRequisitionLifecycleAssurance() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const journeys = await prisma.requisitionOrderJourney.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      exceptions: { orderBy: { createdAt: "desc" } },
      approvalRoutes: {
        include: {
          steps: {
            include: { decisions: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      purchaseOrderExecutions: {
        include: {
          goodsReceiptSessions: true,
          threeWayMatchCases: {
            include: {
              paymentReadinessCase: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const now = new Date();

  const assessed = journeys.map((journey) => {
    const activeExceptions = journey.exceptions.filter(
      (item) =>
        !["RESOLVED", "CLOSED", "DISMISSED"].includes(item.status),
    );

    const approvalRoutes = journey.approvalRoutes;
    const approvalDecisions = approvalRoutes.flatMap((route) =>
      route.steps.flatMap((step) => step.decisions),
    );

    const pendingApprovals = approvalDecisions.filter(
      (decision) => decision.status === "PENDING",
    ).length;

    const poExecutions = journey.purchaseOrderExecutions;
    const receipts = poExecutions.flatMap(
      (execution) => execution.goodsReceiptSessions,
    );
    const matchCases = poExecutions.flatMap(
      (execution) => execution.threeWayMatchCases,
    );
    const paymentReadinessCases = matchCases.flatMap((matchCase) =>
      matchCase.paymentReadinessCase
        ? [matchCase.paymentReadinessCase]
        : [],
    );

    const overdue = Boolean(
      journey.requiredByDate &&
        journey.requiredByDate.getTime() < now.getTime() &&
        !terminalStatuses.has(journey.status),
    );

    const findings: Array<{
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
      code: string;
      message: string;
      actionUrl: string;
    }> = [];

    if (
      approvalStatuses.has(journey.status) &&
      approvalRoutes.length === 0
    ) {
      findings.push({
        severity: "HIGH",
        code: "APPROVAL_ROUTE_MISSING",
        message:
          "Journey is awaiting approval but no approval route is recorded.",
        actionUrl: "/app/requisition-to-order",
      });
    }

    if (
      approvalStatuses.has(journey.status) &&
      approvalRoutes.length > 0 &&
      approvalDecisions.length === 0
    ) {
      findings.push({
        severity: "HIGH",
        code: "APPROVER_MISSING",
        message:
          "Approval routing exists but no approver decisions are assigned.",
        actionUrl: "/app/requisition-to-order",
      });
    }

    if (
      orderStatuses.has(journey.status) &&
      poExecutions.length === 0
    ) {
      findings.push({
        severity: "HIGH",
        code: "PO_EVIDENCE_MISSING",
        message:
          "Journey status requires an order, but no purchase-order execution exists.",
        actionUrl: "/app/requisition-to-order/purchase-orders",
      });
    }

    if (
      receiptStatuses.has(journey.status) &&
      receipts.length === 0
    ) {
      findings.push({
        severity: "HIGH",
        code: "RECEIPT_EVIDENCE_MISSING",
        message:
          "Journey status indicates receipt progress, but no goods-receipt session exists.",
        actionUrl: "/app/requisition-to-order/receipts",
      });
    }

    if (
      journey.status === "CLOSED" &&
      activeExceptions.length > 0
    ) {
      findings.push({
        severity: "CRITICAL",
        code: "CLOSED_WITH_OPEN_EXCEPTION",
        message:
          "Journey is closed while unresolved exceptions remain.",
        actionUrl: "/app/requisition-to-order",
      });
    }

    if (overdue) {
      findings.push({
        severity: "MEDIUM",
        code: "REQUIRED_DATE_OVERDUE",
        message:
          "Required-by date has passed and the journey is not closed or cancelled.",
        actionUrl: "/app/requisition-to-order",
      });
    }

    if (
      matchCases.some(
        (item) =>
          item.status === "APPROVED_FOR_PAYMENT" &&
          !item.paymentReadinessCase,
      )
    ) {
      findings.push({
        severity: "MEDIUM",
        code: "PAYMENT_READINESS_MISSING",
        message:
          "A three-way match is approved for payment but has no AP payment-readiness case.",
        actionUrl: "/app/requisition-to-order/payment-readiness",
      });
    }

    if (
      activeExceptions.length > 0 &&
      journey.status !== "EXCEPTION"
    ) {
      findings.push({
        severity: "MEDIUM",
        code: "STATUS_EXCEPTION_MISMATCH",
        message:
          "Open journey exceptions exist while the journey status is not EXCEPTION.",
        actionUrl: "/app/requisition-to-order",
      });
    }

    const critical = findings.filter(
      (item) => item.severity === "CRITICAL",
    ).length;
    const high = findings.filter(
      (item) => item.severity === "HIGH",
    ).length;
    const medium = findings.filter(
      (item) => item.severity === "MEDIUM",
    ).length;

    const assuranceStatus =
      critical > 0
        ? "CRITICAL"
        : high > 0
          ? "AT_RISK"
          : medium > 0
            ? "ATTENTION"
            : "ASSURED";

    return {
      id: journey.id,
      journeyNumber: journey.journeyNumber,
      title: journey.title,
      status: journey.status,
      currencyCode: journey.currencyCode,
      estimatedAmount: journey.estimatedAmount,
      requiredByDate: journey.requiredByDate,
      overdue,
      assuranceStatus,
      findings,
      activeExceptions: activeExceptions.map(
        (exception) => ({
          id: exception.id,
          code: exception.code,
          title: exception.title,
          severity: exception.severity,
          status: exception.status,
          ownerUserId: exception.ownerUserId,
          createdAt: exception.createdAt,
        }),
      ),
      evidence: {
        approvalRoutes: approvalRoutes.length,
        approvalDecisions: approvalDecisions.length,
        pendingApprovals,
        purchaseOrders: poExecutions.length,
        receipts: receipts.length,
        threeWayMatches: matchCases.length,
        paymentReadinessCases: paymentReadinessCases.length,
        openExceptions: activeExceptions.length,
      },
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    journeys: assessed,
    summary: {
      total: assessed.length,
      assured: assessed.filter(
        (item) => item.assuranceStatus === "ASSURED",
      ).length,
      attention: assessed.filter(
        (item) => item.assuranceStatus === "ATTENTION",
      ).length,
      atRisk: assessed.filter(
        (item) => item.assuranceStatus === "AT_RISK",
      ).length,
      critical: assessed.filter(
        (item) => item.assuranceStatus === "CRITICAL",
      ).length,
      overdue: assessed.filter((item) => item.overdue).length,
      openFindings: assessed.reduce(
        (total, item) => total + item.findings.length,
        0,
      ),
    },
  };
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const n = (value: unknown) => Number(value ?? 0);

export async function getProcurementExecutiveAnalytics() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [
    journeys,
    approvalRoutes,
    purchaseOrders,
    receipts,
    matchCases,
    paymentCases,
  ] = await Promise.all([
    prisma.requisitionOrderJourney.findMany({ where: { tenantId } }),
    prisma.requisitionApprovalRoute.findMany({ where: { tenantId } }),
    prisma.purchaseOrderExecution.findMany({ where: { tenantId } }),
    prisma.goodsReceiptSession.findMany({
      where: { tenantId },
      include: { exceptions: true },
    }),
    prisma.threeWayMatchCase.findMany({
      where: { tenantId },
      include: { exceptions: true },
    }),
    prisma.apPaymentReadinessCase.findMany({
      where: { tenantId },
      include: { holds: true },
    }),
  ]);

  const committedSpend = purchaseOrders.reduce(
    (sum, item) => sum + n(item.totalAmount),
    0,
  );

  const completedApprovalHours = approvalRoutes
  .filter((item) => item.initiatedAt && item.completedAt)
  .map(
    (item) =>
      (item.completedAt!.getTime() - item.initiatedAt!.getTime()) /
      3600000,
  );

  const averageApprovalHours =
    completedApprovalHours.length > 0
      ? completedApprovalHours.reduce((a, b) => a + b, 0) /
        completedApprovalHours.length
      : 0;

  const matched = matchCases.filter((item) =>
    ["MATCHED", "MATCHED_WITH_WARNINGS", "APPROVED_FOR_PAYMENT"].includes(
      item.status,
    ),
  ).length;

  const paymentReady = paymentCases.filter((item) =>
    ["READY", "APPROVED", "BATCHED", "PAID"].includes(item.status),
  ).length;

  const activePaymentHolds = paymentCases.reduce(
    (sum, item) =>
      sum + item.holds.filter((hold) => hold.status === "ACTIVE").length,
    0,
  );

  const openReceiptExceptions = receipts.reduce(
    (sum, item) =>
      sum +
      item.exceptions.filter((e) =>
        ["OPEN", "INVESTIGATING"].includes(e.status),
      ).length,
    0,
  );

  const openMatchExceptions = matchCases.reduce(
    (sum, item) =>
      sum +
      item.exceptions.filter((e) =>
        ["OPEN", "INVESTIGATING"].includes(e.status),
      ).length,
    0,
  );

  return {
    metrics: {
      totalJourneys: journeys.length,
      committedSpend,
      averageApprovalHours,
      purchaseOrderCount: purchaseOrders.length,
      fullyReceivedRate:
        purchaseOrders.length === 0
          ? 0
          : (purchaseOrders.filter((item) =>
              ["FULLY_RECEIVED", "CLOSED"].includes(item.status),
            ).length /
              purchaseOrders.length) *
            100,
      threeWayMatchRate:
        matchCases.length === 0 ? 0 : (matched / matchCases.length) * 100,
      paymentReadinessRate:
        paymentCases.length === 0
          ? 0
          : (paymentReady / paymentCases.length) * 100,
      activePaymentHolds,
      openReceiptExceptions,
      openMatchExceptions,
    },
    bottlenecks: [
      {
        stage: "Approval",
        count: journeys.filter((item) =>
          ["REQUISITION_SUBMITTED", "APPROVAL_PENDING"].includes(item.status),
        ).length,
      },
      {
        stage: "Order creation",
        count: journeys.filter((item) =>
          ["APPROVED", "ORDER_PENDING"].includes(item.status),
        ).length,
      },
      {
        stage: "Receipt",
        count: purchaseOrders.filter((item) =>
          ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(item.status),
        ).length,
      },
      {
        stage: "Invoice match",
        count: matchCases.filter((item) => item.status === "EXCEPTION").length,
      },
      {
        stage: "Payment readiness",
        count: paymentCases.filter((item) =>
          ["DRAFT", "BLOCKED"].includes(item.status),
        ).length,
      },
    ],
    journeyStatus: [
      "DRAFT",
      "REQUISITION_SUBMITTED",
      "APPROVAL_PENDING",
      "APPROVED",
      "ORDER_PENDING",
      "ORDER_ISSUED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CLOSED",
      "CANCELLED",
      "EXCEPTION",
    ].map((status) => ({
      status,
      count: journeys.filter((item) => item.status === status).length,
    })),
    recentOrders: purchaseOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10),
    recentPaymentCases: paymentCases
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10),
  };
}

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getRtoAuditEvidence() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [
    journeys,
    escalationNotifications,
    activities,
  ] = await Promise.all([
    prisma.requisitionOrderJourney.findMany({
      where: { tenantId },
      include: {
        exceptions: {
          orderBy: { createdAt: "asc" },
        },
        milestones: {
          orderBy: { createdAt: "asc" },
        },
        approvalRoutes: {
          include: {
            steps: {
              include: {
                decisions: {
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
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
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    prisma.enterpriseNotification.findMany({
      where: {
        tenantId,
        eventType: {
          startsWith: "RTO_SLA_ESCALATION:",
        },
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 1000,
    }),
    prisma.enterpriseActivity.findMany({
      where: {
        tenantId,
        sourceModule: "requisition-to-order",
      },
      orderBy: { occurredAt: "asc" },
      take: 2000,
    }),
  ]);

  const evidenceByJourney = journeys.map((journey) => {
    const approvalDecisions =
      journey.approvalRoutes.flatMap((route) =>
        route.steps.flatMap((step) => step.decisions),
      );

    const poExecutions =
      journey.purchaseOrderExecutions;

    const receipts =
      poExecutions.flatMap(
        (execution) => execution.goodsReceiptSessions,
      );

    const matches =
      poExecutions.flatMap(
        (execution) => execution.threeWayMatchCases,
      );

    const paymentCases =
      matches.flatMap((matchCase) =>
        matchCase.paymentReadinessCase
          ? [matchCase.paymentReadinessCase]
          : [],
      );

    const escalations =
      escalationNotifications.filter(
        (notification) => {
          const data =
            notification.data &&
            typeof notification.data === "object" &&
            !Array.isArray(notification.data)
              ? notification.data as Record<string, unknown>
              : {};

          return data.journeyId === journey.id;
        },
      );

    const journeyActivities =
      activities.filter(
        (activity) =>
          activity.correlationId ===
            journey.correlationId ||
          activity.subjectId === journey.id ||
          activity.parentId === journey.id,
      );

    return {
      id: journey.id,
      journeyNumber: journey.journeyNumber,
      title: journey.title,
      status: journey.status,
      correlationId: journey.correlationId,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      requiredByDate: journey.requiredByDate,
      currencyCode: journey.currencyCode,
      estimatedAmount:
        journey.estimatedAmount?.toString() ?? null,
      approvals: {
        routes: journey.approvalRoutes.length,
        decisions: approvalDecisions.length,
        pending: approvalDecisions.filter(
          (item) => item.status === "PENDING",
        ).length,
        approved: approvalDecisions.filter(
          (item) => item.status === "APPROVED",
        ).length,
        rejected: approvalDecisions.filter(
          (item) => item.status === "REJECTED",
        ).length,
      },
      exceptions: journey.exceptions,
      milestones: journey.milestones,
      downstream: {
        purchaseOrders: poExecutions.length,
        receipts: receipts.length,
        threeWayMatches: matches.length,
        paymentReadinessCases: paymentCases.length,
      },
      escalations,
      activities: journeyActivities,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    totals: {
      journeys: journeys.length,
      exceptions: journeys.reduce(
        (sum, journey) =>
          sum + journey.exceptions.length,
        0,
      ),
      milestones: journeys.reduce(
        (sum, journey) =>
          sum + journey.milestones.length,
        0,
      ),
      escalations:
        escalationNotifications.length,
      activities: activities.length,
    },
    journeys: evidenceByJourney,
  };
}

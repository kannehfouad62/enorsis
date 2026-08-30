import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getRtoAssurancePriorityQueue() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const journeys =
    await prisma.requisitionOrderJourney.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        exceptions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        approvalRoutes: {
          include: {
            steps: {
              include: {
                decisions: true,
              },
            },
          },
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
    });

  const now = new Date();

  const queue = journeys
    .map((journey) => {
      const activeExceptions =
        journey.exceptions.filter(
          (item) =>
            !["RESOLVED", "DISMISSED"].includes(item.status),
        );

      const criticalExceptions =
        activeExceptions.filter(
          (item) => item.severity === "CRITICAL",
        ).length;

      const highExceptions =
        activeExceptions.filter(
          (item) => item.severity === "HIGH",
        ).length;

      const pendingApprovals =
        journey.approvalRoutes.flatMap((route) =>
          route.steps.flatMap((step) =>
            step.decisions.filter(
              (decision) => decision.status === "PENDING",
            ),
          ),
        ).length;

      const poExecutions =
        journey.purchaseOrderExecutions;

      const receipts =
        poExecutions.flatMap(
          (execution) => execution.goodsReceiptSessions,
        );

      const matchCases =
        poExecutions.flatMap(
          (execution) => execution.threeWayMatchCases,
        );

      const missingPaymentReadiness =
        matchCases.filter(
          (matchCase) =>
            matchCase.status === "APPROVED_FOR_PAYMENT" &&
            !matchCase.paymentReadinessCase,
        ).length;

      const overdue = Boolean(
        journey.requiredByDate &&
          journey.requiredByDate.getTime() < now.getTime() &&
          !["CLOSED", "CANCELLED"].includes(journey.status),
      );

      let score = 0;
      score += criticalExceptions * 100;
      score += highExceptions * 50;
      score += activeExceptions.length * 20;
      score += pendingApprovals * 10;
      score += missingPaymentReadiness * 25;
      score += overdue ? 30 : 0;

      if (
        [
          "APPROVED",
          "ORDER_PENDING",
          "ORDER_ISSUED",
          "PARTIALLY_RECEIVED",
          "RECEIVED",
          "CLOSED",
        ].includes(journey.status) &&
        poExecutions.length === 0
      ) {
        score += 50;
      }

      if (
        [
          "PARTIALLY_RECEIVED",
          "RECEIVED",
          "CLOSED",
        ].includes(journey.status) &&
        receipts.length === 0
      ) {
        score += 50;
      }

      const priority =
        score >= 100
          ? "CRITICAL"
          : score >= 50
            ? "HIGH"
            : score >= 20
              ? "MEDIUM"
              : "LOW";

      return {
        id: journey.id,
        journeyNumber: journey.journeyNumber,
        title: journey.title,
        status: journey.status,
        priority,
        score,
        overdue,
        activeExceptions: activeExceptions.length,
        pendingApprovals,
        missingPaymentReadiness,
        poExecutions: poExecutions.length,
        receipts: receipts.length,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    queue,
    summary: {
      total: queue.length,
      critical: queue.filter(
        (item) => item.priority === "CRITICAL",
      ).length,
      high: queue.filter(
        (item) => item.priority === "HIGH",
      ).length,
      medium: queue.filter(
        (item) => item.priority === "MEDIUM",
      ).length,
      overdue: queue.filter(
        (item) => item.overdue,
      ).length,
      withExceptions: queue.filter(
        (item) => item.activeExceptions > 0,
      ).length,
    },
  };
}

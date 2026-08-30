import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ageHours,
  approvalSlaState,
  exceptionSlaState,
} from "./rto-sla-policy";

export async function getRtoSlaWorkspace() {
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
            createdAt: "asc",
          },
        },
        approvalRoutes: {
          include: {
            steps: {
              include: {
                decisions: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },
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

  const approvalItems =
    journeys.flatMap((journey) =>
      journey.approvalRoutes.flatMap((route) =>
        route.steps.flatMap((step) =>
          step.decisions
            .filter(
              (decision) =>
                decision.status === "PENDING",
            )
            .map((decision) => ({
              type: "APPROVAL" as const,
              id: decision.id,
              journeyId: journey.id,
              journeyNumber:
                journey.journeyNumber,
              title: journey.title,
              status: approvalSlaState(
                decision.createdAt,
                now,
              ),
              ageHours: ageHours(
                decision.createdAt,
                now,
              ),
              createdAt: decision.createdAt,
              ownerUserId:
                decision.approverUserId,
              severity: null,
            })),
        ),
      ),
    );

  const exceptionItems =
    journeys.flatMap((journey) =>
      journey.exceptions
        .filter(
          (exception) =>
            !["RESOLVED", "DISMISSED"].includes(
              exception.status,
            ),
        )
        .map((exception) => ({
          type: "EXCEPTION" as const,
          id: exception.id,
          journeyId: journey.id,
          journeyNumber:
            journey.journeyNumber,
          title: exception.title,
          status: exceptionSlaState(
            exception.severity,
            exception.createdAt,
            now,
          ),
          ageHours: ageHours(
            exception.createdAt,
            now,
          ),
          createdAt: exception.createdAt,
          ownerUserId:
            exception.ownerUserId,
          severity: exception.severity,
        })),
    );

  const items = [
    ...approvalItems,
    ...exceptionItems,
  ].sort((a, b) => {
    const rank = {
      CRITICAL_BREACH: 4,
      BREACHED: 3,
      WARNING: 2,
      ON_TRACK: 1,
    } as const;

    const rankDelta =
      rank[b.status] -
      rank[a.status];

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return b.ageHours - a.ageHours;
  });

  return {
    generatedAt: now.toISOString(),
    items,
    summary: {
      total: items.length,
      criticalBreaches:
        items.filter(
          (item) =>
            item.status === "CRITICAL_BREACH",
        ).length,
      breached:
        items.filter(
          (item) =>
            item.status === "BREACHED",
        ).length,
      warning:
        items.filter(
          (item) =>
            item.status === "WARNING",
        ).length,
      onTrack:
        items.filter(
          (item) =>
            item.status === "ON_TRACK",
        ).length,
      unowned:
        items.filter(
          (item) =>
            !item.ownerUserId,
        ).length,
      pendingApprovals:
        approvalItems.length,
      openExceptions:
        exceptionItems.length,
    },
  };
}

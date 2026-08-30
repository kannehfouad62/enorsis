import { prisma } from "@/lib/prisma";
import {
  createEnterpriseNotification,
} from "@/core/notifications";
import {
  ageHours,
  approvalSlaState,
  exceptionSlaState,
} from "./rto-sla-policy";

type EscalationState =
  | "BREACHED"
  | "CRITICAL_BREACH";

function notificationPriority(
  state: EscalationState,
) {
  return state === "CRITICAL_BREACH"
    ? ("URGENT" as const)
    : ("HIGH" as const);
}

async function alreadyEscalated(
  eventType: string,
) {
  return Boolean(
    await prisma.enterpriseNotification.findFirst({
      where: { eventType },
      select: { id: true },
    }),
  );
}

async function recipient(
  userId: string | null,
) {
  if (!userId) {
    return {
      userId: null,
      email: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

export async function processRtoSlaEscalations() {
  const now = new Date();

  const journeys =
    await prisma.requisitionOrderJourney.findMany({
      where: {
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
        createdAt: "asc",
      },
      take: 500,
    });

  const results: Array<{
    type: "APPROVAL" | "EXCEPTION";
    id: string;
    state: EscalationState;
    notificationId: string | null;
    skipped: boolean;
  }> = [];

  for (const journey of journeys) {
    for (const route of journey.approvalRoutes) {
      for (const step of route.steps) {
        for (const decision of step.decisions) {
          if (decision.status !== "PENDING") {
            continue;
          }

          const state = approvalSlaState(
            decision.createdAt,
            now,
          );

          if (state !== "BREACHED") {
            continue;
          }

          const eventType =
            `RTO_SLA_ESCALATION:APPROVAL:${decision.id}:${state}`;

          if (await alreadyEscalated(eventType)) {
            results.push({
              type: "APPROVAL",
              id: decision.id,
              state,
              notificationId: null,
              skipped: true,
            });
            continue;
          }

          const target = await recipient(
            decision.approverUserId,
          );

          const notification =
            await createEnterpriseNotification({
              tenantId: journey.tenantId,
              eventType,
              recipientUserId: target.userId,
              recipientAddress: target.email,
              title:
                `RTO approval SLA breached - ${journey.journeyNumber}`,
              message:
                `Approval has remained pending for ${ageHours(
                  decision.createdAt,
                  now,
                ).toFixed(1)} hours. Review ${journey.journeyNumber}: ${journey.title}.`,
              actionUrl:
                "/app/requisition-to-order/assurance/sla",
              channels: target.email
                ? ["IN_APP", "EMAIL"]
                : ["IN_APP"],
              priority:
                notificationPriority(state),
              correlationId:
                journey.correlationId,
              data: {
                journeyId: journey.id,
                journeyNumber:
                  journey.journeyNumber,
                decisionId: decision.id,
                slaState: state,
                ageHours: ageHours(
                  decision.createdAt,
                  now,
                ),
              },
            });

          results.push({
            type: "APPROVAL",
            id: decision.id,
            state,
            notificationId:
              notification.id,
            skipped: false,
          });
        }
      }
    }

    for (const exception of journey.exceptions) {
      if (
        ["RESOLVED", "DISMISSED"].includes(
          exception.status,
        )
      ) {
        continue;
      }

      const state = exceptionSlaState(
        exception.severity,
        exception.createdAt,
        now,
      );

      if (
        state !== "BREACHED" &&
        state !== "CRITICAL_BREACH"
      ) {
        continue;
      }

      const eventType =
        `RTO_SLA_ESCALATION:EXCEPTION:${exception.id}:${state}`;

      if (await alreadyEscalated(eventType)) {
        results.push({
          type: "EXCEPTION",
          id: exception.id,
          state,
          notificationId: null,
          skipped: true,
        });
        continue;
      }

      const target = await recipient(
        exception.ownerUserId,
      );

      const notification =
        await createEnterpriseNotification({
          tenantId: journey.tenantId,
          eventType,
          recipientUserId: target.userId,
          recipientAddress: target.email,
          title:
            `${state === "CRITICAL_BREACH" ? "Critical " : ""}RTO exception SLA breached - ${journey.journeyNumber}`,
          message:
            `${exception.title} has remained unresolved for ${ageHours(
              exception.createdAt,
              now,
            ).toFixed(1)} hours. Severity: ${exception.severity}.`,
          actionUrl:
            "/app/requisition-to-order/assurance/sla",
          channels: target.email
            ? ["IN_APP", "EMAIL"]
            : ["IN_APP"],
          priority:
            notificationPriority(state),
          correlationId:
            journey.correlationId,
          data: {
            journeyId: journey.id,
            journeyNumber:
              journey.journeyNumber,
            exceptionId: exception.id,
            severity:
              exception.severity,
            slaState: state,
            ageHours: ageHours(
              exception.createdAt,
              now,
            ),
          },
        });

      results.push({
        type: "EXCEPTION",
        id: exception.id,
        state,
        notificationId:
          notification.id,
        skipped: false,
      });
    }
  }

  return {
    processedAt: now.toISOString(),
    selected: results.length,
    created:
      results.filter(
        (item) => !item.skipped,
      ).length,
    deduplicated:
      results.filter(
        (item) => item.skipped,
      ).length,
    results,
  };
}

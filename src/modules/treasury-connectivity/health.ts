import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";
import {
  processTreasuryConnectivityEvents,
} from "./processor";

const HOUR_MS = 60 * 60 * 1000;

async function notifyFinanceLeadership({
  tenantId,
  title,
  message,
  priority,
  incidentKey,
}: {
  tenantId: string;
  title: string;
  message: string;
  priority: "HIGH" | "URGENT";
  incidentKey: string;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      roles: {
        hasSome: [
          "TENANT_OWNER",
          "TENANT_ADMIN",
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
        tenantId,
        eventType: "Treasury.ConnectivityHealth",
        recipientUserId: membership.user.id,
        recipientAddress: membership.user.email,
        title,
        message,
        actionUrl:
          "/app/requisition-to-order/treasury/connectivity",
        priority,
        channels: membership.user.email
          ? ["IN_APP", "EMAIL"]
          : ["IN_APP"],
        correlationId: incidentKey,
        data: {
          incidentKey,
          sourceModule:
            "treasury-connectivity-health",
        },
      }),
    ),
  );
}

async function upsertIncident({
  tenantId,
  integrationId,
  externalAccountLinkId,
  incidentKey,
  severity,
  incidentType,
  message,
}: {
  tenantId: string;
  integrationId: string;
  externalAccountLinkId?: string | null;
  incidentKey: string;
  severity: "WARNING" | "CRITICAL";
  incidentType: string;
  message: string;
}) {
  const now = new Date();

  const existing =
    await prisma.treasuryConnectivityHealthIncident.findUnique({
      where: {
        incidentKey,
      },
    });

  if (existing) {
    await prisma.treasuryConnectivityHealthIncident.update({
      where: {
        id: existing.id,
      },
      data: {
        severity,
        message,
        status: "OPEN",
        lastDetectedAt: now,
        resolvedAt: null,
      },
    });

    return {
      created: false,
      incidentId: existing.id,
    };
  }

  const incident =
    await prisma.treasuryConnectivityHealthIncident.create({
      data: {
        tenantId,
        integrationId,
        externalAccountLinkId:
          externalAccountLinkId ?? null,
        incidentKey,
        severity,
        incidentType,
        message,
      },
    });

  await notifyFinanceLeadership({
    tenantId,
    title:
      severity === "CRITICAL"
        ? "Treasury connectivity critical"
        : "Treasury connectivity warning",
    message,
    priority:
      severity === "CRITICAL"
        ? "URGENT"
        : "HIGH",
    incidentKey,
  });

  return {
    created: true,
    incidentId: incident.id,
  };
}

async function resolveIncident(
  incidentKey: string,
) {
  const now = new Date();

  return prisma.treasuryConnectivityHealthIncident.updateMany({
    where: {
      incidentKey,
      status: "OPEN",
    },
    data: {
      status: "RESOLVED",
      resolvedAt: now,
      lastDetectedAt: now,
    },
  });
}

export async function evaluateTreasuryConnectivityHealth() {
  const now = new Date();

  const integrations =
    await prisma.integrationConnection.findMany({
      where: {
        status: "ACTIVE",
        inboundEnabled: true,
      },
    });

  const results = [];

  for (const integration of integrations) {
    const links =
      await prisma.treasuryExternalAccountLink.findMany({
        where: {
          integrationId:
            integration.id,
          active: true,
        },
      });

    const recentFailedSyncs =
      await prisma.treasuryConnectivitySyncLog.count({
        where: {
          integrationId:
            integration.id,
          status: "FAILED",
          processedAt: {
            gte: new Date(
              now.getTime() -
                6 * HOUR_MS,
            ),
          },
        },
      });

    const failureIncidentKey =
      `${integration.id}:RECENT_FAILURES`;

    if (recentFailedSyncs >= 3) {
      const message =
        `${integration.name} has ${recentFailedSyncs} failed treasury sync event(s) in the last 6 hours.`;

      const incident =
        await upsertIncident({
          tenantId:
            integration.tenantId,
          integrationId:
            integration.id,
          incidentKey:
            failureIncidentKey,
          severity: "CRITICAL",
          incidentType:
            "REPEATED_SYNC_FAILURE",
          message,
        });

      results.push({
        integrationId:
          integration.id,
        type:
          "REPEATED_SYNC_FAILURE",
        status: "OPEN",
        ...incident,
      });
    } else {
      await resolveIncident(
        failureIncidentKey,
      );
    }

    for (const link of links) {
      const latestSnapshot =
        await prisma.treasuryBalanceSnapshot.findFirst({
          where: {
            tenantId:
              integration.tenantId,
            treasuryAccountId:
              link.treasuryAccountId,
          },
          orderBy: {
            balanceDate: "desc",
          },
        });

      const staleAfterMs =
        link.expectedFeedMinutes *
        60 *
        1000;

      const ageMs = latestSnapshot
        ? now.getTime() -
          latestSnapshot.balanceDate.getTime()
        : Number.POSITIVE_INFINITY;

      const staleIncidentKey =
        `${link.id}:STALE_BALANCE_FEED`;

      if (ageMs > staleAfterMs) {
        const hoursLate =
          Number.isFinite(ageMs)
            ? Math.floor(
                (ageMs - staleAfterMs) /
                  HOUR_MS,
              )
            : null;

        const severity =
          ageMs >
          staleAfterMs * 2
            ? "CRITICAL"
            : "WARNING";

        const message =
          latestSnapshot
            ? `${integration.name} balance feed for external account ${link.externalAccountId} is overdue by approximately ${Math.max(
                0,
                hoursLate ?? 0,
              )} hour(s).`
            : `${integration.name} has not supplied any balance feed for external account ${link.externalAccountId}.`;

        const incident =
          await upsertIncident({
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            externalAccountLinkId:
              link.id,
            incidentKey:
              staleIncidentKey,
            severity,
            incidentType:
              "STALE_BALANCE_FEED",
            message,
          });

        results.push({
          integrationId:
            integration.id,
          externalAccountLinkId:
            link.id,
          type:
            "STALE_BALANCE_FEED",
          status: "OPEN",
          ...incident,
        });
      } else {
        await resolveIncident(
          staleIncidentKey,
        );
      }
    }
  }

  return results;
}

export async function runTreasuryConnectivityAutomation() {
  const processing =
    await processTreasuryConnectivityEvents({
      limit: 200,
    });

  const health =
    await evaluateTreasuryConnectivityHealth();

  return {
    processedEvents:
      processing.length,
    processing,
    healthIncidents:
      health.length,
    health,
  };
}

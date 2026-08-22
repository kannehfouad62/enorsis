import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  listEnterpriseConnectorAdapters,
} from "@/core/integrations";
import { prisma } from "@/lib/prisma";

function envName(reference: string) {
  const name = reference.startsWith("env:")
    ? reference.slice(4)
    : reference;

  return /^[A-Z][A-Z0-9_]*$/.test(name)
    ? name
    : null;
}

export async function getProviderOperationalReadiness() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  if (!permitted) {
    redirect("/app/unauthorized");
  }

  const connections =
    await prisma.enterpriseConnectorConnection.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      include: {
        connectorDefinition: true,
        credentials: {
          where: {
            status: "ACTIVE",
          },
        },
        syncRuns: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

  const registeredAdapters =
    new Set(listEnterpriseConnectorAdapters());

  const now = Date.now();

  const readiness = connections.map((connection) => {
    const adapterRegistered =
      registeredAdapters.has(
        connection.connectorDefinition.key,
      );

    const credentialChecks =
      connection.credentials.map((credential) => {
        const name = envName(
          credential.secretReference,
        );

        return {
          id: credential.id,
          name: credential.name,
          credentialType:
            credential.credentialType,
          secretReference:
            credential.secretReference,
          envName: name,
          configured:
            Boolean(name && process.env[name]),
          expiresAt:
            credential.expiresAt?.toISOString() ??
            null,
          expired:
            Boolean(
              credential.expiresAt &&
                credential.expiresAt.getTime() <
                  now,
            ),
        };
      });

    const missingCredentials =
      credentialChecks.filter(
        (item) =>
          !item.configured ||
          item.expired,
      );

    const latestRun =
      connection.syncRuns[0] ?? null;

    const latestFailedRun =
      connection.syncRuns.find(
        (run) =>
          run.status === "FAILED",
      ) ?? null;

    const healthReady =
      connection.healthStatus === "HEALTHY";

    const statusReady =
      connection.status === "ACTIVE";

    const ready =
      adapterRegistered &&
      credentialChecks.length > 0 &&
      missingCredentials.length === 0 &&
      statusReady &&
      healthReady;

    const blockers: string[] = [];

    if (!adapterRegistered) {
      blockers.push(
        "No native execution adapter is registered.",
      );
    }

    if (
      adapterRegistered &&
      credentialChecks.length === 0
    ) {
      blockers.push(
        "No active credential references are configured.",
      );
    }

    if (
      missingCredentials.some(
        (item) => !item.configured,
      )
    ) {
      blockers.push(
        "One or more referenced environment secrets are missing.",
      );
    }

    if (
      missingCredentials.some(
        (item) => item.expired,
      )
    ) {
      blockers.push(
        "One or more credential references are expired.",
      );
    }

    if (!statusReady) {
      blockers.push(
        `Connection status is ${connection.status}.`,
      );
    }

    if (!healthReady) {
      blockers.push(
        "Provider health check has not passed.",
      );
    }

    return {
      id: connection.id,
      name: connection.name,
      provider:
        connection.connectorDefinition.provider,
      definitionKey:
        connection.connectorDefinition.key,
      definitionName:
        connection.connectorDefinition.name,
      environment:
        connection.environment,
      status: connection.status,
      healthStatus:
        connection.healthStatus,
      baseUrl: connection.baseUrl,
      adapterRegistered,
      credentialChecks,
      ready,
      blockers,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            direction:
              latestRun.direction,
            createdAt:
              latestRun.createdAt.toISOString(),
            completedAt:
              latestRun.completedAt?.toISOString() ??
              null,
            recordsWritten:
              latestRun.recordsWritten,
            recordsFailed:
              latestRun.recordsFailed,
          }
        : null,
      latestFailedRun: latestFailedRun
        ? {
            id: latestFailedRun.id,
            errorMessage:
              latestFailedRun.errorMessage,
            createdAt:
              latestFailedRun.createdAt.toISOString(),
          }
        : null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    connections: readiness,
    summary: {
      total: readiness.length,
      ready:
        readiness.filter(
          (item) => item.ready,
        ).length,
      blocked:
        readiness.filter(
          (item) => !item.ready,
        ).length,
      nativeAdapters:
        readiness.filter(
          (item) =>
            item.adapterRegistered,
        ).length,
      healthy:
        readiness.filter(
          (item) =>
            item.healthStatus ===
            "HEALTHY",
        ).length,
    },
  };
}

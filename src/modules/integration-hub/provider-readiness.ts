import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ENTERPRISE_INTEGRATION_PROVIDER_PROFILES } from "@/core/integrations";
import {
  listEnterpriseConnectorAdapters,
} from "@/core/integrations";
import { prisma } from "@/lib/prisma";
import { getProviderCertificationPolicy } from "./provider-certification";

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
          take: 20,
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

    const certificationPolicy =
      getProviderCertificationPolicy(
        connection.connectorDefinition.key,
      );

    const successfulRuns =
      connection.syncRuns.filter(
        (run) =>
          run.status === "SUCCEEDED" ||
          run.status === "PARTIALLY_SUCCEEDED",
      );

    const successfulWriteRun =
      successfulRuns.find(
        (run) => run.recordsWritten > 0,
      ) ?? null;

    const hasConfiguredCredentials =
      credentialChecks.length > 0 &&
      missingCredentials.length === 0;

    const externalPrerequisitePending =
      Boolean(
        certificationPolicy.externalPrerequisite &&
          !healthReady &&
          !successfulWriteRun,
      );

    const certificationLevel =
      externalPrerequisitePending
        ? "CUSTOMER_ACCOUNT_REQUIRED"
        : successfulWriteRun && healthReady
          ? "LIVE_CERTIFIED"
          : healthReady
            ? "HEALTH_VERIFIED"
            : adapterRegistered &&
                hasConfiguredCredentials
              ? "CONFIGURATION_READY"
              : "IMPLEMENTED";

    const certificationPassed =
      certificationLevel === "LIVE_CERTIFIED";

    const ready =
      adapterRegistered &&
      hasConfiguredCredentials &&
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

    if (
      certificationPolicy.externalPrerequisite &&
      externalPrerequisitePending
    ) {
      blockers.push(
        certificationPolicy.externalPrerequisite,
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
      certification: {
        level: certificationLevel,
        passed: certificationPassed,
        externalPrerequisite:
          certificationPolicy.externalPrerequisite,
        externalPrerequisitePending,
        healthVerified: healthReady,
        syncVerified: Boolean(successfulWriteRun),
        latestSuccessfulWriteRun:
          successfulWriteRun
            ? {
                id: successfulWriteRun.id,
                createdAt:
                  successfulWriteRun.createdAt.toISOString(),
                completedAt:
                  successfulWriteRun.completedAt?.toISOString() ??
                  null,
                recordsWritten:
                  successfulWriteRun.recordsWritten,
                recordsFailed:
                  successfulWriteRun.recordsFailed,
              }
            : null,
      },
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

  const configuredDefinitionKeys = new Set(
    readiness.map((item) => item.definitionKey),
  );

  const catalogOnlyProviders =
    ENTERPRISE_INTEGRATION_PROVIDER_PROFILES
      .filter(
        (profile) =>
          !configuredDefinitionKeys.has(
            profile.definitionKey,
          ),
      )
      .map((profile) => {
        const certificationPolicy =
          getProviderCertificationPolicy(
            profile.definitionKey,
          );

        const level =
          certificationPolicy.externalPrerequisite
            ? "CUSTOMER_ACCOUNT_REQUIRED"
            : registeredAdapters.has(
                  profile.definitionKey,
                )
              ? "IMPLEMENTED"
              : "IMPLEMENTED";

        return {
          id: `catalog:${profile.definitionKey}`,
          name: profile.name,
          provider: profile.provider,
          definitionKey: profile.definitionKey,
          definitionName: profile.name,
          environment: "NOT CONFIGURED",
          status: "NOT_CONFIGURED",
          healthStatus: "UNKNOWN",
          baseUrl: null,
          adapterRegistered:
            registeredAdapters.has(
              profile.definitionKey,
            ),
          credentialChecks: [],
          ready: false,
          blockers: [
            "No tenant connection has been configured.",
            ...(certificationPolicy.externalPrerequisite
              ? [
                  certificationPolicy.externalPrerequisite,
                ]
              : []),
          ],
          certification: {
            level,
            passed: false,
            externalPrerequisite:
              certificationPolicy.externalPrerequisite,
            externalPrerequisitePending: Boolean(
              certificationPolicy.externalPrerequisite,
            ),
            healthVerified: false,
            syncVerified: false,
            latestSuccessfulWriteRun: null,
          },
          latestRun: null,
          latestFailedRun: null,
          catalogOnly: true,
        };
      });

  const providers = [
    ...readiness.map((item) => ({
      ...item,
      catalogOnly: false,
    })),
    ...catalogOnlyProviders,
  ].sort((a, b) =>
    `${a.provider} ${a.definitionName}`.localeCompare(
      `${b.provider} ${b.definitionName}`,
    ),
  );

  return {
    generatedAt: new Date().toISOString(),
    connections: providers,
    summary: {
      total: providers.length,
      configured:
        providers.filter(
          (item) => !item.catalogOnly,
        ).length,
      ready:
        providers.filter(
          (item) => item.ready,
        ).length,
      blocked:
        providers.filter(
          (item) => !item.ready,
        ).length,
      nativeAdapters:
        providers.filter(
          (item) =>
            item.adapterRegistered,
        ).length,
      healthy:
        providers.filter(
          (item) =>
            item.healthStatus ===
            "HEALTHY",
        ).length,
      certified:
        providers.filter(
          (item) =>
            item.certification.passed,
        ).length,
      customerAccountRequired:
        providers.filter(
          (item) =>
            item.certification.level ===
            "CUSTOMER_ACCOUNT_REQUIRED",
        ).length,
    },
  };
}

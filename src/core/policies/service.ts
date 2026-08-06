import { createHash } from "node:crypto";
import { hasFeature } from "@/core/licensing";
import { prisma } from "@/lib/prisma";
import type { FeatureFlagDecision, PolicyValue } from "./types";

export async function getEnterprisePolicy<T extends PolicyValue>(
  tenantId: string,
  policyKey: string,
): Promise<T> {
  const now = new Date();

  const definition =
    await prisma.enterprisePolicyDefinition.findUnique({
      where: { key: policyKey },
      include: {
        tenantOverrides: {
          where: {
            tenantId,
            active: true,
            effectiveFrom: { lte: now },
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gt: now } },
            ],
          },
          take: 1,
        },
      },
    });

  if (!definition || definition.status !== "ACTIVE") {
    throw new Error(`Enterprise policy ${policyKey} is not active.`);
  }

  const value =
    definition.tenantOverrides[0]?.value ?? definition.defaultValue;

  return value as T;
}

export async function isEnterpriseFeatureFlagEnabled({
  tenantId,
  flagKey,
  subjectKey,
}: {
  tenantId: string;
  flagKey: string;
  subjectKey?: string;
}): Promise<FeatureFlagDecision> {
  const now = new Date();

  const flag = await prisma.enterpriseFeatureFlag.findUnique({
    where: { key: flagKey },
    include: {
      tenantOverrides: {
        where: {
          tenantId,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        take: 1,
      },
    },
  });

  if (!flag) return { enabled: false, source: "UNKNOWN" };
  if (flag.status !== "ACTIVE") {
    return { enabled: false, source: "INACTIVE" };
  }

  const override = flag.tenantOverrides[0];
  if (override) {
    return {
      enabled: override.enabled,
      source: "TENANT_OVERRIDE",
    };
  }

  if (flag.managedPaaSOnly) {
    const aiAccess = await hasFeature(tenantId, "AI_PLATFORM");
    if (!aiAccess) {
      return {
        enabled: false,
        source: "MANAGED_PAAS_ONLY",
      };
    }
  }

  if (flag.requiresFeatureKey) {
    const entitled = await hasFeature(
      tenantId,
      flag.requiresFeatureKey,
    );

    if (!entitled) {
      return {
        enabled: false,
        source: "REQUIRED_FEATURE",
      };
    }
  }

  if (flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100) {
    const bucket = rolloutBucket(
      `${tenantId}:${subjectKey ?? tenantId}:${flag.key}`,
    );

    return {
      enabled: bucket < flag.rolloutPercentage,
      source: "ROLLOUT",
    };
  }

  return {
    enabled: flag.defaultEnabled,
    source: "DEFAULT",
  };
}

function rolloutBucket(value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return parseInt(digest.slice(0, 8), 16) % 100;
}

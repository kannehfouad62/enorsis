"use server";

import { prisma } from "@/lib/prisma";
import type { FeatureAccessDecision, FeatureKey } from "./types";

const activeStatuses = ["TRIAL", "ACTIVE"] as const;

export async function getFeatureAccess(
  tenantId: string,
  featureKey: FeatureKey | string,
): Promise<FeatureAccessDecision> {
  const now = new Date();

  const feature = await prisma.platformFeature.findUnique({
    where: { key: featureKey },
    include: {
      entitlements: {
        where: {
          tenantId,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        take: 1,
      },
    },
  });

  if (!feature || !feature.active) {
    return { allowed: false, source: "UNKNOWN_FEATURE", featureKey };
  }

  const override = feature.entitlements[0];
  if (override?.effect === "DENY") {
    return { allowed: false, source: "TENANT_DENY", featureKey };
  }
  if (override?.effect === "ALLOW") {
    return { allowed: true, source: "TENANT_ALLOW", featureKey };
  }

  const subscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      status: { in: [...activeStatuses] },
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: {
      edition: {
        include: {
          features: {
            where: { featureId: feature.id, enabled: true },
          },
        },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  if (!subscription) {
    return { allowed: false, source: "NO_SUBSCRIPTION", featureKey };
  }

  if (
    feature.managedPaaSOnly &&
    subscription.edition.code !== "MANAGED_PAAS"
  ) {
    return {
      allowed: false,
      source: "MANAGED_PAAS_ONLY",
      featureKey,
      editionCode: subscription.edition.code,
    };
  }

  return {
    allowed: subscription.edition.features.length > 0,
    source: "EDITION",
    featureKey,
    editionCode: subscription.edition.code,
  };
}

export async function hasFeature(
  tenantId: string,
  featureKey: FeatureKey | string,
) {
  return (await getFeatureAccess(tenantId, featureKey)).allowed;
}

export async function requireFeature(
  tenantId: string,
  featureKey: FeatureKey | string,
) {
  const decision = await getFeatureAccess(tenantId, featureKey);
  if (!decision.allowed) {
    throw new Error(
      `Feature ${featureKey} is not enabled for this tenant (${decision.source}).`,
    );
  }
  return decision;
}

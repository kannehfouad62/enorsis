"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { EDITIONS, EDITION_FEATURES, FEATURES } from "./catalog";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function seedLicensingCatalogAction() {
  await requireAnyRole(["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"]);

  await prisma.$transaction(async (tx) => {
    for (const [code, name, rank] of EDITIONS) {
      await tx.commercialEdition.upsert({
        where: { code },
        create: { code, name, rank },
        update: { name, rank, active: true },
      });
    }

    for (const [key, name, groupKey, managedPaaSOnly] of FEATURES) {
      await tx.platformFeature.upsert({
        where: { key },
        create: {
          key,
          name,
          groupKey,
          managedPaaSOnly,
          aiFeature: key === "AI_PLATFORM",
        },
        update: {
          name,
          groupKey,
          managedPaaSOnly,
          aiFeature: key === "AI_PLATFORM",
          active: true,
        },
      });
    }

    const editions = await tx.commercialEdition.findMany();
    const features = await tx.platformFeature.findMany();

    for (const edition of editions) {
      const enabled = EDITION_FEATURES[edition.code] ?? [];
      for (const feature of features) {
        await tx.editionFeature.upsert({
          where: {
            editionId_featureId: {
              editionId: edition.id,
              featureId: feature.id,
            },
          },
          create: {
            editionId: edition.id,
            featureId: feature.id,
            enabled: enabled.includes(feature.key),
          },
          update: { enabled: enabled.includes(feature.key) },
        });
      }
    }
  });

  revalidatePath("/app/settings/licensing");
}

export async function assignTenantEditionAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const tenantId = field(data, "tenantId");
  const editionId = field(data, "editionId");

  await prisma.$transaction([
    prisma.tenantSubscription.updateMany({
      where: { tenantId, status: { in: ["TRIAL", "ACTIVE"] } },
      data: { status: "CANCELLED", endsAt: new Date() },
    }),
    prisma.tenantSubscription.create({
      data: {
        tenantId,
        editionId,
        status: "ACTIVE",
        externalCustomerId: `manual:${user.id}`,
      },
    }),
  ]);

  revalidatePath("/app/settings/licensing");
}

export async function setTenantEntitlementAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const tenantId = field(data, "tenantId");
  const featureId = field(data, "featureId");

  await prisma.tenantEntitlement.upsert({
    where: { tenantId_featureId: { tenantId, featureId } },
    create: {
      tenantId,
      featureId,
      effect: field(data, "effect") as "ALLOW" | "DENY",
      reason: field(data, "reason") || null,
      grantedByUserId: user.id,
    },
    update: {
      effect: field(data, "effect") as "ALLOW" | "DENY",
      reason: field(data, "reason") || null,
      grantedByUserId: user.id,
      startsAt: new Date(),
    },
  });

  revalidatePath("/app/settings/licensing");
}

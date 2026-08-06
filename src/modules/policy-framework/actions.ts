"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

function parseValue(value: string, type: string) {
  if (type === "BOOLEAN") return value === "true";
  if (type === "NUMBER") return Number(value);
  if (type === "JSON") return JSON.parse(value);
  return value;
}

export async function createPolicyDefinitionAction(data: FormData) {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const valueType = field(data, "valueType");

  await prisma.enterprisePolicyDefinition.create({
    data: {
      key: field(data, "key"),
      name: field(data, "name"),
      description: field(data, "description") || null,
      category: field(data, "category"),
      moduleKey: field(data, "moduleKey") || null,
      valueType: valueType as
        | "BOOLEAN"
        | "STRING"
        | "NUMBER"
        | "JSON",
      defaultValue: toJson(
        parseValue(field(data, "defaultValue"), valueType),
      ),
      status: "ACTIVE",
      managedByPlatform: data.get("managedByPlatform") === "on",
    },
  });

  revalidatePath("/app/settings/policies");
}

export async function setTenantPolicyAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const definition =
    await prisma.enterprisePolicyDefinition.findUniqueOrThrow({
      where: { id: field(data, "policyDefinitionId") },
    });

  if (
    definition.managedByPlatform &&
    !user.roles.some((role) =>
      ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"].includes(role),
    )
  ) {
    throw new Error("This policy is managed by the platform.");
  }

  await prisma.enterpriseTenantPolicy.upsert({
    where: {
      tenantId_policyDefinitionId: {
        tenantId: user.tenantId,
        policyDefinitionId: definition.id,
      },
    },
    create: {
      tenantId: user.tenantId,
      policyDefinitionId: definition.id,
      value: toJson(
        parseValue(field(data, "value"), definition.valueType),
      ),
      reason: field(data, "reason") || null,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
    update: {
      value: toJson(
        parseValue(field(data, "value"), definition.valueType),
      ),
      reason: field(data, "reason") || null,
      active: true,
      effectiveFrom: new Date(),
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/policies");
}

export async function createFeatureFlagAction(data: FormData) {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.enterpriseFeatureFlag.create({
    data: {
      key: field(data, "key"),
      name: field(data, "name"),
      description: field(data, "description") || null,
      moduleKey: field(data, "moduleKey") || null,
      status: "ACTIVE",
      defaultEnabled: data.get("defaultEnabled") === "on",
      rolloutPercentage: Number(
        field(data, "rolloutPercentage") || 0,
      ),
      managedPaaSOnly: data.get("managedPaaSOnly") === "on",
      requiresFeatureKey:
        field(data, "requiresFeatureKey") || null,
    },
  });

  revalidatePath("/app/settings/policies");
}

export async function setTenantFeatureFlagAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.enterpriseTenantFeatureFlag.upsert({
    where: {
      tenantId_featureFlagId: {
        tenantId: user.tenantId,
        featureFlagId: field(data, "featureFlagId"),
      },
    },
    create: {
      tenantId: user.tenantId,
      featureFlagId: field(data, "featureFlagId"),
      enabled: field(data, "enabled") === "true",
      reason: field(data, "reason") || null,
      createdByUserId: user.id,
    },
    update: {
      enabled: field(data, "enabled") === "true",
      reason: field(data, "reason") || null,
      startsAt: new Date(),
      expiresAt: null,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/policies");
}

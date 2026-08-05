"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const checked = (data: FormData, key: string) =>
  data.get(key) === "on";

const optionalInt = (data: FormData, key: string) => {
  const value = field(data, key);
  return value ? Number(value) : null;
};

const optionalBigInt = (data: FormData, key: string) => {
  const value = field(data, key);
  return value ? BigInt(value) : null;
};

export async function updateTenantConfigurationAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const tenantId = user.tenantId;

  await prisma.tenantConfiguration.upsert({
    where: { tenantId },
    create: buildData(data, tenantId, user.id),
    update: buildUpdate(data, user.id),
  });

  revalidatePath("/app/settings/configuration");
}

function buildData(data: FormData, tenantId: string, userId: string) {
  return {
    tenantId,
    ...buildUpdate(data, userId),
    createdByUserId: userId,
  };
}

function buildUpdate(data: FormData, userId: string) {
  return {
    environmentType: field(data, "environmentType") as
      | "SHARED_SAAS"
      | "DEDICATED_SAAS"
      | "MANAGED_PAAS"
      | "SELF_HOSTED",
    dataResidency: field(data, "dataResidency") as
      | "UNITED_STATES"
      | "CANADA"
      | "EUROPEAN_UNION"
      | "UNITED_KINGDOM"
      | "AUSTRALIA"
      | "SINGAPORE"
      | "GLOBAL"
      | "CUSTOM",
    customResidencyRegion: field(data, "customResidencyRegion") || null,
    displayName: field(data, "displayName") || null,
    legalName: field(data, "legalName") || null,
    logoUrl: field(data, "logoUrl") || null,
    primaryColor: field(data, "primaryColor") || null,
    secondaryColor: field(data, "secondaryColor") || null,
    customDomain: field(data, "customDomain") || null,
    locale: field(data, "locale") || "en-US",
    timeZone: field(data, "timeZone") || "UTC",
    defaultCurrencyCode: field(data, "defaultCurrencyCode") || "USD",
    fiscalYearStartMonth: Number(field(data, "fiscalYearStartMonth") || 1),
    dateFormat: field(data, "dateFormat") || "MM/dd/yyyy",
    numberFormat: field(data, "numberFormat") || "en-US",
    weekStartsOn: Number(field(data, "weekStartsOn") || 1),
    requireMfa: checked(data, "requireMfa"),
    enforceSso: checked(data, "enforceSso"),
    sessionTimeoutMinutes: Number(field(data, "sessionTimeoutMinutes") || 480),
    passwordMinLength: Number(field(data, "passwordMinLength") || 12),
    documentRetentionDays: Number(field(data, "documentRetentionDays") || 2555),
    auditRetentionDays: Number(field(data, "auditRetentionDays") || 2555),
    emailNotifications: checked(data, "emailNotifications"),
    inAppNotifications: checked(data, "inAppNotifications"),
    dailyDigestEnabled: checked(data, "dailyDigestEnabled"),
    dailyDigestHour: Number(field(data, "dailyDigestHour") || 8),
    maxUsers: optionalInt(data, "maxUsers"),
    maxSuppliers: optionalInt(data, "maxSuppliers"),
    maxStorageMb: optionalBigInt(data, "maxStorageMb"),
    maxApiRequestsPerMonth: optionalBigInt(data, "maxApiRequestsPerMonth"),
    supportTier: field(data, "supportTier") || "STANDARD",
    maintenanceWindow: field(data, "maintenanceWindow") || null,
    updatedByUserId: userId,
  };
}

import { prisma } from "@/lib/prisma";

export async function getTenantConfiguration(tenantId: string) {
  return prisma.tenantConfiguration.findUnique({
    where: { tenantId },
  });
}

export async function getOrCreateTenantConfiguration({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId?: string;
}) {
  return prisma.tenantConfiguration.upsert({
    where: { tenantId },
    create: {
      tenantId,
      createdByUserId: userId ?? null,
      updatedByUserId: userId ?? null,
    },
    update: {},
  });
}

export async function getTenantOperationalContext(tenantId: string) {
  const configuration = await getOrCreateTenantConfiguration({ tenantId });

  return {
    locale: configuration.locale,
    timeZone: configuration.timeZone,
    defaultCurrencyCode: configuration.defaultCurrencyCode,
    fiscalYearStartMonth: configuration.fiscalYearStartMonth,
    dateFormat: configuration.dateFormat,
    numberFormat: configuration.numberFormat,
    weekStartsOn: configuration.weekStartsOn,
    environmentType: configuration.environmentType,
    dataResidency: configuration.dataResidency,
  };
}

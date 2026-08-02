"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  CurrencyPolicyMode,
  LegalEntityStatus,
  MembershipStatus,
  PlatformRole,
  SiteStatus,
  TenantStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  bootstrapOrganizationSchema,
  createDepartmentSchema,
  createLegalEntitySchema,
  createSiteSchema,
  updateCurrencyPolicySchema,
} from "./schemas";

async function requireOrganizationAdministrator() {
  const session = await auth();

  if (!session?.user?.email || !session.user.tenantId) {
    throw new Error("Authentication is required.");
  }

  const acceptedRoles = new Set([
    "PLATFORM_SUPER_ADMIN",
    "TENANT_OWNER",
    "TENANT_ADMIN",
  ]);

  if (!session.user.roles.some((role) => acceptedRoles.has(role))) {
    throw new Error("Organization administrator access is required.");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    roles: session.user.roles,
  };
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

export async function bootstrapOrganizationAction(formData: FormData) {
  const user = await requireOrganizationAdministrator();
  const input = bootstrapOrganizationSchema.parse({
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    countryCode: value(formData, "countryCode"),
    baseCurrencyCode: value(formData, "baseCurrencyCode"),
  });

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { id: user.tenantId },
      update: {
        name: input.name,
        legalName: input.legalName,
        countryCode: input.countryCode,
        baseCurrencyCode: input.baseCurrencyCode,
        status: TenantStatus.ACTIVE,
      },
      create: {
        id: user.tenantId,
        slug: user.tenantSlug,
        name: input.name,
        legalName: input.legalName,
        countryCode: input.countryCode,
        baseCurrencyCode: input.baseCurrencyCode,
        status: TenantStatus.ACTIVE,
      },
    });

    const databaseUser = await tx.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        isActive: true,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: true,
      },
    });

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: databaseUser.id,
        },
      },
      update: {
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.TENANT_OWNER],
        activatedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        userId: databaseUser.id,
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.TENANT_OWNER],
        activatedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: databaseUser.id,
        actorType: "USER",
        actorId: databaseUser.id,
        actorLabel: databaseUser.email,
        action: "organization.bootstrap",
        resourceType: "Tenant",
        resourceId: tenant.id,
        after: input,
      },
    });
  });

  revalidatePath("/app/settings/organization");
}

export async function updateCurrencyPolicyAction(formData: FormData) {
  const user = await requireOrganizationAdministrator();
  const input = updateCurrencyPolicySchema.parse({
    currencyPolicyMode: value(formData, "currencyPolicyMode"),
    baseCurrencyCode: value(formData, "baseCurrencyCode"),
    localDisplayCurrency: value(formData, "localDisplayCurrency"),
  });

  const before = await prisma.tenant.findUniqueOrThrow({
    where: { id: user.tenantId },
    select: {
      currencyPolicyMode: true,
      baseCurrencyCode: true,
      localDisplayCurrency: true,
    },
  });

  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      currencyPolicyMode:
        input.currencyPolicyMode as CurrencyPolicyMode,
      baseCurrencyCode: input.baseCurrencyCode,
      localDisplayCurrency:
        input.currencyPolicyMode === "USD_WITH_LOCAL_DISPLAY"
          ? input.localDisplayCurrency
          : null,
      usdReportingEnabled: true,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "organization.currency_policy.update",
      resourceType: "Tenant",
      resourceId: user.tenantId,
      before,
      after: {
        currencyPolicyMode: updated.currencyPolicyMode,
        baseCurrencyCode: updated.baseCurrencyCode,
        localDisplayCurrency: updated.localDisplayCurrency,
      },
    },
  });

  revalidatePath("/app/settings/organization");
}

export async function createLegalEntityAction(formData: FormData) {
  const user = await requireOrganizationAdministrator();
  const input = createLegalEntitySchema.parse({
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    countryCode: value(formData, "countryCode"),
    baseCurrencyCode: value(formData, "baseCurrencyCode"),
    registrationNumber: value(formData, "registrationNumber"),
  });

  await prisma.legalEntity.create({
    data: {
      tenantId: user.tenantId,
      name: input.name,
      legalName: input.legalName,
      countryCode: input.countryCode,
      baseCurrencyCode: input.baseCurrencyCode,
      registrationNumber: input.registrationNumber || null,
      status: LegalEntityStatus.ACTIVE,
    },
  });

  revalidatePath("/app/settings/organization");
}

export async function createSiteAction(formData: FormData) {
  const user = await requireOrganizationAdministrator();
  const input = createSiteSchema.parse({
    legalEntityId: value(formData, "legalEntityId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
    countryCode: value(formData, "countryCode"),
    city: value(formData, "city"),
    timeZone: value(formData, "timeZone"),
  });

  await prisma.site.create({
    data: {
      tenantId: user.tenantId,
      legalEntityId: input.legalEntityId || null,
      code: input.code,
      name: input.name,
      countryCode: input.countryCode,
      city: input.city || null,
      timeZone: input.timeZone,
      status: SiteStatus.ACTIVE,
    },
  });

  revalidatePath("/app/settings/organization");
}

export async function createDepartmentAction(formData: FormData) {
  const user = await requireOrganizationAdministrator();
  const input = createDepartmentSchema.parse({
    legalEntityId: value(formData, "legalEntityId"),
    siteId: value(formData, "siteId"),
    code: value(formData, "code"),
    name: value(formData, "name"),
  });

  await prisma.department.create({
    data: {
      tenantId: user.tenantId,
      legalEntityId: input.legalEntityId || null,
      siteId: input.siteId || null,
      code: input.code,
      name: input.name,
    },
  });

  revalidatePath("/app/settings/organization");
}

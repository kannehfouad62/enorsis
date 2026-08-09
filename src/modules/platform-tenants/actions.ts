"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  CurrencyPolicyMode,
  MembershipStatus,
  PlatformRole,
  TenantStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  assignPlatformTenantOwnerSchema,
  createPlatformTenantSchema,
  updatePlatformTenantStatusSchema,
} from "./schemas";

async function requirePlatformSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    throw new Error("Authentication is required.");
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    throw new Error("Platform Super Admin access is required.");
  }

  return session.user;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function createPlatformTenantAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = createPlatformTenantSchema.parse({
    name: value(formData, "name"),
    legalName: value(formData, "legalName"),
    slug: value(formData, "slug"),
    countryCode: value(formData, "countryCode"),
    defaultLocale: value(formData, "defaultLocale") || "en-US",
    defaultTimeZone: value(formData, "defaultTimeZone") || "UTC",
    currencyPolicyMode: value(formData, "currencyPolicyMode"),
    baseCurrencyCode: value(formData, "baseCurrencyCode"),
    localDisplayCurrency: value(formData, "localDisplayCurrency") || undefined,
    ownerName: value(formData, "ownerName"),
    ownerEmail: value(formData, "ownerEmail"),
    activateImmediately: checked(formData, "activateImmediately"),
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingSlug = await tx.tenant.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new Error("A tenant with this slug already exists.");
    }

    const tenant = await tx.tenant.create({
      data: {
        slug: input.slug,
        name: input.name,
        legalName: input.legalName,
        status: input.activateImmediately
          ? TenantStatus.ACTIVE
          : TenantStatus.PROVISIONING,
        countryCode: input.countryCode,
        defaultLocale: input.defaultLocale,
        defaultTimeZone: input.defaultTimeZone,
        currencyPolicyMode:
          input.currencyPolicyMode as CurrencyPolicyMode,
        baseCurrencyCode: input.baseCurrencyCode,
        localDisplayCurrency:
          input.currencyPolicyMode === "USD_WITH_LOCAL_DISPLAY"
            ? input.localDisplayCurrency ?? null
            : null,
        usdReportingEnabled: true,
      },
    });

    const owner = await tx.user.upsert({
      where: { email: input.ownerEmail },
      update: {
        name: input.ownerName,
        isActive: true,
      },
      create: {
        email: input.ownerEmail,
        name: input.ownerName,
        isActive: true,
      },
    });

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: owner.id,
        },
      },
      update: {
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
      create: {
        tenantId: tenant.id,
        userId: owner.id,
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: actor.id,
        actorType: "USER",
        actorId: actor.id,
        actorLabel: actor.email,
        action: "platform.tenant.create",
        resourceType: "Tenant",
        resourceId: tenant.id,
        after: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          countryCode: tenant.countryCode,
          ownerEmail: input.ownerEmail,
        },
      },
    });

    return tenant;
  });

  revalidatePath("/app/settings/tenants");
  redirect(`/app/settings/tenants/${result.id}`);
}

export async function updatePlatformTenantStatusAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = updatePlatformTenantStatusSchema.parse({
    tenantId: value(formData, "tenantId"),
    status: value(formData, "status"),
  });

  if (actor.tenantId === input.tenantId && input.status === "SUSPENDED") {
    throw new Error("You cannot suspend the tenant backing your current authenticated session.");
  }

  const before = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { status: true },
  });

  const updated = await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      status: input.status as TenantStatus,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: updated.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.status.update",
      resourceType: "Tenant",
      resourceId: updated.id,
      before,
      after: { status: updated.status },
    },
  });

  revalidatePath("/app/settings/tenants");
  revalidatePath(`/app/settings/tenants/${updated.id}`);
}

export async function assignPlatformTenantOwnerAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = assignPlatformTenantOwnerSchema.parse({
    tenantId: value(formData, "tenantId"),
    ownerName: value(formData, "ownerName"),
    ownerEmail: value(formData, "ownerEmail"),
  });

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: input.tenantId },
      select: { id: true, name: true },
    });

    const user = await tx.user.upsert({
      where: { email: input.ownerEmail },
      update: {
        name: input.ownerName,
        isActive: true,
      },
      create: {
        email: input.ownerEmail,
        name: input.ownerName,
        isActive: true,
      },
    });

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: new Date(),
        invitedByUserId: actor.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: actor.id,
        actorType: "USER",
        actorId: actor.id,
        actorLabel: actor.email,
        action: "platform.tenant.owner.assign",
        resourceType: "Tenant",
        resourceId: tenant.id,
        after: {
          tenantName: tenant.name,
          ownerEmail: input.ownerEmail,
        },
      },
    });
  });

  revalidatePath(`/app/settings/tenants/${input.tenantId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { MembershipStatus, PlatformRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema, updateMembershipSchema } from "./schemas";

async function requireAccessAdministrator() {
  const session = await auth();
  if (!session?.user?.email || !session.user.tenantId) {
    throw new Error("Authentication is required.");
  }

  const allowed = new Set(["PLATFORM_SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN"]);
  if (!session.user.roles.some((role) => allowed.has(role))) {
    throw new Error("Access administrator permission is required.");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    tenantId: session.user.tenantId,
  };
}

function values(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

export async function inviteMemberAction(formData: FormData) {
  const actor = await requireAccessAdministrator();
  const input = inviteMemberSchema.parse({
    email: value(formData, "email"),
    name: value(formData, "name"),
    jobTitle: value(formData, "jobTitle"),
    employeeId: value(formData, "employeeId"),
    roles: values(formData, "roles"),
    approvalLimitUsd: value(formData, "approvalLimitUsd") || undefined,
    legalEntityScopeIds: values(formData, "legalEntityScopeIds"),
    siteScopeIds: values(formData, "siteScopeIds"),
    departmentScopeIds: values(formData, "departmentScopeIds"),
  });

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: input.email },
      update: { name: input.name },
      create: { email: input.email, name: input.name },
    });

    const membership = await tx.membership.upsert({
      where: {
        tenantId_userId: { tenantId: actor.tenantId, userId: user.id },
      },
      update: {
        status: MembershipStatus.INVITED,
        roles: input.roles as PlatformRole[],
        jobTitle: input.jobTitle || null,
        employeeId: input.employeeId || null,
        approvalLimitUsd: input.approvalLimitUsd,
        legalEntityScopeIds: input.legalEntityScopeIds,
        siteScopeIds: input.siteScopeIds,
        departmentScopeIds: input.departmentScopeIds,
        invitedByUserId: actor.id,
        invitedAt: new Date(),
      },
      create: {
        tenantId: actor.tenantId,
        userId: user.id,
        status: MembershipStatus.INVITED,
        roles: input.roles as PlatformRole[],
        jobTitle: input.jobTitle || null,
        employeeId: input.employeeId || null,
        approvalLimitUsd: input.approvalLimitUsd,
        legalEntityScopeIds: input.legalEntityScopeIds,
        siteScopeIds: input.siteScopeIds,
        departmentScopeIds: input.departmentScopeIds,
        invitedByUserId: actor.id,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        actorType: "USER",
        actorId: actor.id,
        actorLabel: actor.email,
        action: "membership.invite",
        resourceType: "Membership",
        resourceId: membership.id,
        after: {
          email: input.email,
          roles: input.roles,
          approvalLimitUsd: input.approvalLimitUsd,
        },
      },
    });
  });

  revalidatePath("/app/settings/access");
}

export async function updateMembershipAction(formData: FormData) {
  const actor = await requireAccessAdministrator();
  const input = updateMembershipSchema.parse({
    membershipId: value(formData, "membershipId"),
    status: value(formData, "status"),
    jobTitle: value(formData, "jobTitle"),
    employeeId: value(formData, "employeeId"),
    roles: values(formData, "roles"),
    approvalLimitUsd: value(formData, "approvalLimitUsd") || undefined,
    legalEntityScopeIds: values(formData, "legalEntityScopeIds"),
    siteScopeIds: values(formData, "siteScopeIds"),
    departmentScopeIds: values(formData, "departmentScopeIds"),
  });

  const existing = await prisma.membership.findFirstOrThrow({
    where: { id: input.membershipId, tenantId: actor.tenantId },
    include: { user: true },
  });

  const removingOwner =
    existing.roles.includes(PlatformRole.TENANT_OWNER) &&
    !input.roles.includes("TENANT_OWNER");

  if (removingOwner || input.status === "REVOKED") {
    const ownerCount = await prisma.membership.count({
      where: {
        tenantId: actor.tenantId,
        status: MembershipStatus.ACTIVE,
        roles: { has: PlatformRole.TENANT_OWNER },
      },
    });

    if (ownerCount <= 1 && existing.roles.includes(PlatformRole.TENANT_OWNER)) {
      throw new Error("The final active tenant owner cannot be removed or revoked.");
    }
  }

  const updated = await prisma.membership.update({
    where: { id: existing.id },
    data: {
      status: input.status as MembershipStatus,
      roles: input.roles as PlatformRole[],
      jobTitle: input.jobTitle || null,
      employeeId: input.employeeId || null,
      approvalLimitUsd: input.approvalLimitUsd,
      legalEntityScopeIds: input.legalEntityScopeIds,
      siteScopeIds: input.siteScopeIds,
      departmentScopeIds: input.departmentScopeIds,
      activatedAt:
        input.status === "ACTIVE" && !existing.activatedAt
          ? new Date()
          : existing.activatedAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "membership.update",
      resourceType: "Membership",
      resourceId: updated.id,
      before: {
        status: existing.status,
        roles: existing.roles,
        approvalLimitUsd: existing.approvalLimitUsd?.toString(),
      },
      after: {
        status: updated.status,
        roles: updated.roles,
        approvalLimitUsd: updated.approvalLimitUsd?.toString(),
      },
    },
  });

  revalidatePath("/app/settings/access");
}

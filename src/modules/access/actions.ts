"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { MembershipStatus, PlatformRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  issueTenantUserActivationInvitation,
} from "@/core/tenant-user-activation/service";
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

function assertSegregationOfDuties(roles: readonly string[]) {
  const roleSet = new Set(roles);
  const conflicts = [
    ["REQUESTER", "APPROVER"],
    ["BUYER", "AUDITOR"],
    ["FINANCE", "AUDITOR"],
  ] as const;

  for (const [left, right] of conflicts) {
    if (roleSet.has(left) && roleSet.has(right)) {
      throw new Error(`${left} and ${right} cannot be assigned together.`);
    }
  }
}

export async function inviteMemberAction(formData: FormData) {
  const actor = await requireAccessAdministrator();

  const input = inviteMemberSchema.parse({
    email: value(formData, "email"),
    name: value(formData, "name"),
    jobTitle: value(formData, "jobTitle"),
    employeeId: value(formData, "employeeId"),
    roles: values(formData, "roles"),
    approvalLimitUsd:
      value(formData, "approvalLimitUsd") || undefined,
    legalEntityScopeIds: values(
      formData,
      "legalEntityScopeIds",
    ),
    siteScopeIds: values(formData, "siteScopeIds"),
    departmentScopeIds: values(
      formData,
      "departmentScopeIds",
    ),
  });

  assertSegregationOfDuties(input.roles);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  const result = await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.upsert({
        where: { email: input.email },
        update: {
          name: input.name,
          isActive: true,
        },
        create: {
          email: input.email,
          name: input.name,
          mustChangePassword: false,
          isActive: true,
        },
      });

      const hasExistingCredentials = Boolean(
        existingUser?.passwordHash,
      );

      const membership =
        await tx.membership.upsert({
          where: {
            tenantId_userId: {
              tenantId: actor.tenantId,
              userId: user.id,
            },
          },
          update: {
            status: hasExistingCredentials
              ? MembershipStatus.ACTIVE
              : MembershipStatus.INVITED,
            roles: input.roles as PlatformRole[],
            jobTitle: input.jobTitle || null,
            employeeId: input.employeeId || null,
            approvalLimitUsd:
              input.approvalLimitUsd,
            legalEntityScopeIds:
              input.legalEntityScopeIds,
            siteScopeIds: input.siteScopeIds,
            departmentScopeIds:
              input.departmentScopeIds,
            invitedByUserId: actor.id,
            invitedAt: new Date(),
            activatedAt: hasExistingCredentials
              ? new Date()
              : null,
          },
          create: {
            tenantId: actor.tenantId,
            userId: user.id,
            status: hasExistingCredentials
              ? MembershipStatus.ACTIVE
              : MembershipStatus.INVITED,
            roles: input.roles as PlatformRole[],
            jobTitle: input.jobTitle || null,
            employeeId: input.employeeId || null,
            approvalLimitUsd:
              input.approvalLimitUsd,
            legalEntityScopeIds:
              input.legalEntityScopeIds,
            siteScopeIds: input.siteScopeIds,
            departmentScopeIds:
              input.departmentScopeIds,
            invitedByUserId: actor.id,
            invitedAt: new Date(),
            activatedAt: hasExistingCredentials
              ? new Date()
              : null,
          },
        });

      await tx.auditEvent.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          actorType: "USER",
          actorId: actor.id,
          actorLabel: actor.email,
          action: hasExistingCredentials
            ? "membership.access_added_existing_user"
            : "membership.invite",
          resourceType: "Membership",
          resourceId: membership.id,
          after: {
            email: input.email,
            roles: input.roles,
            approvalLimitUsd:
              input.approvalLimitUsd,
            status: membership.status,
            secureActivationRequired:
              !hasExistingCredentials,
          },
        },
      });

      return {
        userId: user.id,
        hasExistingCredentials,
      };
    },
  );

  if (!result.hasExistingCredentials) {
    await issueTenantUserActivationInvitation({
      tenantId: actor.tenantId,
      userId: result.userId,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });
  }

  revalidatePath("/app/settings/access");
}

export async function updateMembershipAction(formData: FormData) {
  const actor = await requireAccessAdministrator();
  const input = updateMembershipSchema.parse({
    membershipId: value(formData, "membershipId"),
    status: value(formData, "status"),
    jobTitle: value(formData, "jobTitle"),
    employeeId: value(formData, "employeeId"),
    temporaryPassword: value(formData, "temporaryPassword"),
    roles: values(formData, "roles"),
    approvalLimitUsd: value(formData, "approvalLimitUsd") || undefined,
    legalEntityScopeIds: values(formData, "legalEntityScopeIds"),
    siteScopeIds: values(formData, "siteScopeIds"),
    departmentScopeIds: values(formData, "departmentScopeIds"),
  });

  assertSegregationOfDuties(input.roles);

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


export async function resendMemberActivationAction(
  formData: FormData,
) {
  const actor = await requireAccessAdministrator();
  const membershipId = value(
    formData,
    "membershipId",
  );

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      tenantId: actor.tenantId,
      status: MembershipStatus.INVITED,
    },
    include: {
      user: {
        select: {
          id: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error(
      "Invited tenant membership was not found.",
    );
  }

  if (membership.user.passwordHash) {
    throw new Error(
      "This invited user already has credentials. Use Reset & resend activation.",
    );
  }

  await issueTenantUserActivationInvitation({
    tenantId: actor.tenantId,
    userId: membership.user.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
  });

  revalidatePath("/app/settings/access");
}

export async function resetAndResendMemberActivationAction(
  formData: FormData,
) {
  const actor = await requireAccessAdministrator();
  const membershipId = value(
    formData,
    "membershipId",
  );

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      tenantId: actor.tenantId,
      status: MembershipStatus.INVITED,
    },
    include: {
      user: {
        select: {
          id: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error(
      "Invited tenant membership was not found.",
    );
  }

  if (!membership.user.passwordHash) {
    throw new Error(
      "This invited user has no credentials to reset. Use Resend activation.",
    );
  }

  if (membership.user.id === actor.id) {
    throw new Error(
      "You cannot reset your own credentials through tenant invitation recovery.",
    );
  }

  await issueTenantUserActivationInvitation({
    tenantId: actor.tenantId,
    userId: membership.user.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
    resetCredentials: true,
  });

  revalidatePath("/app/settings/access");
}

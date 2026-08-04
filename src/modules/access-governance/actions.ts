"use server";

import { revalidatePath } from "next/cache";
import { PlatformRole } from "@/generated/prisma/client";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createSodRuleAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
    "RISK_COMPLIANCE",
    "AUDITOR",
  ]);

  await prisma.sodRule.create({
    data: {
      tenantId: user.tenantId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      description: field(formData, "description"),
      conflictingRoleA: field(formData, "conflictingRoleA"),
      conflictingRoleB: field(formData, "conflictingRoleB"),
      severity: Number(field(formData, "severity") || 3),
      remediationGuidance:
        field(formData, "remediationGuidance") || null,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/access-governance");
}

export async function scanSodViolationsAction() {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
    "RISK_COMPLIANCE",
    "AUDITOR",
  ]);

  const [rules, memberships] = await Promise.all([
    prisma.sodRule.findMany({
      where: { tenantId: user.tenantId, status: "ACTIVE" },
    }),
    prisma.membership.findMany({
      where: {
        tenantId: user.tenantId,
        status: "ACTIVE",
      },
      include: { user: true },
    }),
  ]);

  let detected = 0;

  for (const rule of rules) {
    for (const membership of memberships) {
      const roles = membership.roles.map(String);
      const conflict =
        roles.includes(rule.conflictingRoleA) &&
        roles.includes(rule.conflictingRoleB);

      if (!conflict) continue;

      await prisma.sodViolation.upsert({
        where: {
          sodRuleId_membershipId: {
            sodRuleId: rule.id,
            membershipId: membership.id,
          },
        },
        update: {
          detectedRoles: roles,
          userEmail: membership.user.email,
          userName: membership.user.name,
          status: "OPEN",
        },
        create: {
          tenantId: user.tenantId,
          sodRuleId: rule.id,
          membershipId: membership.id,
          userId: membership.userId,
          userEmail: membership.user.email,
          userName: membership.user.name,
          detectedRoles: roles,
        },
      });

      detected += 1;
    }
  }

  revalidatePath("/app/settings/access-governance");

// Server Actions used by <form action={...}> must not return values.
// The dashboard refreshes automatically after revalidation.
return;
}

export async function createAccessReviewCampaignAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
    "RISK_COMPLIANCE",
    "AUDITOR",
  ]);

  await prisma.accessReviewCampaign.create({
    data: {
      tenantId: user.tenantId,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      reviewerUserId: field(formData, "reviewerUserId"),
      scopeRoles: formData.getAll("scopeRoles").map(String),
      scopeUserIds: [],
      dueAt: new Date(field(formData, "dueAt")),
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/access-governance");
}

export async function launchAccessReviewCampaignAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
    "RISK_COMPLIANCE",
    "AUDITOR",
  ]);

  const campaignId = field(formData, "campaignId");
  const campaign = await prisma.accessReviewCampaign.findFirstOrThrow({
    where: {
      id: campaignId,
      tenantId: user.tenantId,
      status: "DRAFT",
    },
  });

  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: user.tenantId,
      status: "ACTIVE",
      ...(campaign.scopeRoles.length > 0
        ? {
            roles: {
              hasSome: campaign.scopeRoles as PlatformRole[],
            },
          }
        : {}),
    },
    include: { user: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.accessReviewItem.createMany({
      data: memberships.map((membership) => ({
        campaignId: campaign.id,
        membershipId: membership.id,
        userId: membership.userId,
        userEmail: membership.user.email,
        userName: membership.user.name,
        currentRoles: membership.roles.map(String),
        requestedRoles: membership.roles.map(String),
      })),
      skipDuplicates: true,
    });

    await tx.accessReviewCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "ACTIVE",
        launchedAt: new Date(),
      },
    });
  });

  revalidatePath("/app/settings/access-governance");
  revalidatePath(`/app/settings/access-governance/reviews/${campaign.id}`);
}

export async function decideAccessReviewItemAction(formData: FormData) {
  const user = await requireAnyRole([
    "TENANT_ADMIN",
    "TENANT_OWNER",
    "RISK_COMPLIANCE",
    "AUDITOR",
  ]);

  const itemId = field(formData, "itemId");
  const decision = field(formData, "decision") as
    | "CERTIFY"
    | "REVOKE"
    | "CHANGE_ROLE"
    | "APPROVE_EXCEPTION";

  const item = await prisma.accessReviewItem.findFirstOrThrow({
    where: {
      id: itemId,
      campaign: { tenantId: user.tenantId, status: "ACTIVE" },
    },
  });

  const status =
    decision === "CERTIFY"
      ? "CERTIFIED"
      : decision === "REVOKE"
        ? "REVOKE_REQUESTED"
        : decision === "CHANGE_ROLE"
          ? "ROLE_CHANGE_REQUESTED"
          : "EXCEPTION_APPROVED";

  await prisma.accessReviewItem.update({
    where: { id: item.id },
    data: {
      status,
      decision,
      decisionComments: field(formData, "decisionComments") || null,
      requestedRoles: field(formData, "requestedRoles")
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean),
      decidedByUserId: user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath(
    `/app/settings/access-governance/reviews/${item.campaignId}`,
  );
}

export async function remediateAccessReviewItemAction(
  formData: FormData,
) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const itemId = field(formData, "itemId");

  const item = await prisma.accessReviewItem.findFirstOrThrow({
    where: {
      id: itemId,
      campaign: { tenantId: user.tenantId },
      status: {
        in: ["REVOKE_REQUESTED", "ROLE_CHANGE_REQUESTED"],
      },
    },
  });

  const requestedRoles = item.requestedRoles as PlatformRole[];

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: item.membershipId },
      data: {
        status:
          item.status === "REVOKE_REQUESTED" ? "SUSPENDED" : "ACTIVE",
        roles:
          item.status === "ROLE_CHANGE_REQUESTED"
            ? requestedRoles
            : undefined,
      },
    }),
    prisma.accessReviewItem.update({
      where: { id: item.id },
      data: {
        status: "REMEDIATED",
        remediatedByUserId: user.id,
        remediatedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "access_review.remediate",
        resourceType: "AccessReviewItem",
        resourceId: item.id,
        after: {
          membershipId: item.membershipId,
          requestedRoles: item.requestedRoles,
          reviewStatus: item.status,
        },
      },
    }),
  ]);

  revalidatePath(
    `/app/settings/access-governance/reviews/${item.campaignId}`,
  );
}

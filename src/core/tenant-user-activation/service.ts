import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const NS = "enorsis:tenant-user-activation:v1:";
const TTL_HOURS = 24;

function hashToken(token: string) {
  return createHash("sha256").update(`${NS}${token}`).digest("hex");
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "https://www.enorsis.com"
  ).replace(/\/+$/, "");
}

function fromAddress() {
  const value =
    process.env.RESEND_FROM_EMAIL ??
    process.env.WORKFLOW_EMAIL_FROM;
  if (!value) {
    throw new Error("RESEND_FROM_EMAIL (or WORKFLOW_EMAIL_FROM) is required.");
  }
  return value;
}

function resendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function issueTenantUserActivationInvitation(input: {
  tenantId: string;
  userId: string;
  actorUserId: string;
  actorEmail: string;
  resetCredentials?: boolean;
}) {
  const membership =
    await prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.userId,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
          },
        },
      },
    });

  if (!membership) {
    throw new Error(
      "Tenant membership was not found.",
    );
  }

  if (membership.roles.length === 0) {
    throw new Error(
      "Assign at least one tenant role before sending activation.",
    );
  }

  if (
    membership.user.passwordHash &&
    !input.resetCredentials
  ) {
    throw new Error(
      "This user already has login credentials. Use Reset & resend activation only for an inconsistent invited account.",
    );
  }

  if (
    input.resetCredentials &&
    membership.status !== "INVITED"
  ) {
    throw new Error(
      "Credential reset is allowed only for an invited membership.",
    );
  }

  const rawToken =
    randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      TTL_HOURS * 60 * 60 * 1000,
  );
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Every resend invalidates prior unused activation/reset tokens.
    await tx.passwordResetToken.updateMany({
      where: {
        userId: membership.user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    if (input.resetCredentials) {
      await tx.user.update({
        where: {
          id: membership.user.id,
        },
        data: {
          passwordHash: null,
          passwordChangedAt: null,
          mustChangePassword: false,
          sessionVersion: {
            increment: 1,
          },
        },
      });
    }

    await tx.passwordResetToken.create({
      data: {
        userId: membership.user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await tx.membership.update({
      where: {
        tenantId_userId: {
          tenantId: membership.tenant.id,
          userId: membership.user.id,
        },
      },
      data: {
        status: "INVITED",
        activatedAt: null,
        invitedAt: now,
        invitedByUserId:
          input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: membership.tenant.id,
        userId: input.actorUserId,
        actorType: "USER",
        actorId: input.actorUserId,
        actorLabel: input.actorEmail,
        action: input.resetCredentials
          ? "tenant.member.activation.reset_invited"
          : "tenant.member.activation.invited",
        resourceType: "User",
        resourceId: membership.user.id,
        after: {
          userEmail:
            membership.user.email,
          roles: membership.roles,
          expiresAt:
            expiresAt.toISOString(),
          credentialReset: Boolean(
            input.resetCredentials,
          ),
        },
      },
    });
  });

  const url =
    `${baseUrl()}/activate-user-account?tenant=${encodeURIComponent(
      membership.tenant.id,
    )}&token=${encodeURIComponent(rawToken)}`;

  const result =
    await resendClient().emails.send({
      from: fromAddress(),
      to: membership.user.email,
      subject:
        `Activate your Enorsis account for ${membership.tenant.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#102a43">
          <p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#1f5eff;text-transform:uppercase">Enorsis</p>
          <h1>Activate your account</h1>
          <p>Hello ${escapeHtml(
            membership.user.name ??
              "Enorsis User",
          )},</p>
          <p>You have been added to <strong>${escapeHtml(
            membership.tenant.name,
          )}</strong> on Enorsis.</p>
          <p>Your assigned roles: <strong>${escapeHtml(
            membership.roles.join(", "),
          )}</strong></p>
          <p style="margin:28px 0">
            <a href="${escapeHtml(url)}"
               style="background:#102a43;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">
              Activate Enorsis Account
            </a>
          </p>
          <p>This secure link expires in ${TTL_HOURS} hours and can be used only once.</p>
        </div>
      `,
      text:
        `Activate your Enorsis account for ${membership.tenant.name}\n\n` +
        `${url}\n\nThis link expires in ${TTL_HOURS} hours.`,
    });

  if (result.error) {
    await prisma.auditEvent.create({
      data: {
        tenantId: membership.tenant.id,
        userId: input.actorUserId,
        actorType: "USER",
        actorId: input.actorUserId,
        actorLabel: input.actorEmail,
        action:
          "tenant.member.activation.email.failed",
        resourceType: "User",
        resourceId: membership.user.id,
        outcome: "FAILURE",
        reason:
          result.error.message ||
          "Resend failed to deliver the activation email.",
        after: {
          userEmail:
            membership.user.email,
          expiresAt:
            expiresAt.toISOString(),
        },
      },
    });

    throw new Error(
      result.error.message ||
        "Resend failed to deliver the activation email.",
    );
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: membership.tenant.id,
      userId: input.actorUserId,
      actorType: "USER",
      actorId: input.actorUserId,
      actorLabel: input.actorEmail,
      action:
        "tenant.member.activation.email.sent",
      resourceType: "User",
      resourceId: membership.user.id,
      after: {
        userEmail: membership.user.email,
        providerMessageId:
          result.data?.id ?? null,
        expiresAt:
          expiresAt.toISOString(),
      },
    },
  });

  return {
    expiresAt,
    providerMessageId:
      result.data?.id ?? null,
  };
}

export async function resolveTenantUserActivation(input: {
  tenantId: string;
  rawToken: string;
}) {
  if (!input.rawToken || input.rawToken.length < 20 || !input.tenantId) {
    return null;
  }

  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.rawToken) },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              tenantId: input.tenantId,
              status: "INVITED",
            },
            include: {
              tenant: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (
    !token ||
    token.usedAt ||
    token.expiresAt.getTime() <= Date.now() ||
    token.user.passwordHash ||
    token.user.memberships.length === 0
  ) {
    return null;
  }

  const membership = token.user.memberships[0];
  return {
    tokenId: token.id,
    tenantId: membership.tenant.id,
    tenantName: membership.tenant.name,
    userId: token.user.id,
    userName: token.user.name,
    userEmail: token.user.email,
    roles: membership.roles,
    expiresAt: token.expiresAt,
  };
}

export async function consumeTenantUserActivation(input: {
  tenantId: string;
  rawToken: string;
  passwordHash: string;
}) {
  const context = await resolveTenantUserActivation({
    tenantId: input.tenantId,
    rawToken: input.rawToken,
  });
  if (!context) {
    throw new Error("This activation link is invalid, expired, already used, or the account is already activated.");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({
      where: { id: context.tokenId },
      select: { usedAt: true, expiresAt: true },
    });

    if (!token || token.usedAt || token.expiresAt.getTime() <= now.getTime()) {
      throw new Error("This activation link is invalid, expired, or already used.");
    }

    await tx.user.update({
      where: { id: context.userId },
      data: {
        passwordHash: input.passwordHash,
        passwordChangedAt: now,
        mustChangePassword: false,
        emailVerified: now,
        isActive: true,
        sessionVersion: { increment: 1 },
      },
    });

    await tx.membership.update({
      where: {
        tenantId_userId: {
          tenantId: context.tenantId,
          userId: context.userId,
        },
      },
      data: {
        status: "ACTIVE",
        activatedAt: now,
        lastActiveAt: now,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: context.tokenId },
      data: { usedAt: now },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        actorType: "USER",
        actorId: context.userId,
        actorLabel: context.userEmail,
        action: "tenant.member.activation.completed",
        resourceType: "User",
        resourceId: context.userId,
        after: {
          emailVerified: true,
          membershipStatus: "ACTIVE",
          roles: context.roles,
          activatedAt: now.toISOString(),
        },
      },
    });

    return context;
  });
}

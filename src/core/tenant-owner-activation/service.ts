import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const NS = "enorsis:tenant-owner-activation:v1:";
const TTL_HOURS = 24;

function tokenHash(token: string) {
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
    throw new Error(
      "RESEND_FROM_EMAIL (or WORKFLOW_EMAIL_FROM) is required.",
    );
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

export async function issueTenantOwnerActivationInvitation(input: {
  tenantId: string;
  userId: string;
  actorUserId: string;
  actorEmail: string;
}) {
  const owner = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      memberships: {
        where: {
          tenantId: input.tenantId,
          roles: { has: "TENANT_OWNER" },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!owner || owner.memberships.length === 0) {
    throw new Error("Tenant Owner membership was not found.");
  }

  if (owner.passwordHash) {
    throw new Error(
      "This Tenant Owner already has login credentials.",
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    throw new Error("Tenant was not found.");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const hash = tokenHash(rawToken);
  const expiresAt = new Date(
    Date.now() + TTL_HOURS * 60 * 60 * 1000,
  );

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.create({
      data: {
        userId: owner.id,
        tokenHash: hash,
        expiresAt,
      },
    });

    await tx.membership.update({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: owner.id,
        },
      },
      data: {
        status: "INVITED",
        activatedAt: null,
        invitedAt: new Date(),
        invitedByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: input.actorUserId,
        actorType: "USER",
        actorId: input.actorUserId,
        actorLabel: input.actorEmail,
        action: "platform.tenant.owner.activation.invited",
        resourceType: "User",
        resourceId: owner.id,
        after: {
          ownerEmail: owner.email,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
  });

  const url = `${baseUrl()}/activate-account?token=${encodeURIComponent(rawToken)}`;
  const result = await resendClient().emails.send({
    from: fromAddress(),
    to: owner.email,
    subject: `Activate your Enorsis account for ${tenant.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#102a43">
        <p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#1f5eff;text-transform:uppercase">Enorsis</p>
        <h1>Activate your account</h1>
        <p>Hello ${escapeHtml(owner.name ?? "Tenant Owner")},</p>
        <p>You have been invited to administer <strong>${escapeHtml(tenant.name)}</strong> on Enorsis.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(url)}"
             style="background:#102a43;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">
            Activate Enorsis Account
          </a>
        </p>
        <p>This link expires in ${TTL_HOURS} hours and can be used only once.</p>
        <p>If you did not expect this invitation, ignore this email.</p>
      </div>
    `,
    text: `Activate your Enorsis account for ${tenant.name}\n\n${url}\n\nThis link expires in ${TTL_HOURS} hours.`,
  });

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Resend failed to deliver the activation email.",
    );
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      userId: input.actorUserId,
      actorType: "USER",
      actorId: input.actorUserId,
      actorLabel: input.actorEmail,
      action: "platform.tenant.owner.activation.email.sent",
      resourceType: "User",
      resourceId: owner.id,
      after: {
        ownerEmail: owner.email,
        providerMessageId: result.data?.id ?? null,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  return {
    expiresAt,
    providerMessageId: result.data?.id ?? null,
  };
}

export async function resolveTenantOwnerActivation(
  rawToken: string,
) {
  if (!rawToken || rawToken.length < 20) {
    return null;
  }

  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(rawToken) },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              status: "INVITED",
              roles: { has: "TENANT_OWNER" },
            },
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
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
    tenantSlug: membership.tenant.slug,
    userId: token.user.id,
    ownerName: token.user.name,
    ownerEmail: token.user.email,
    expiresAt: token.expiresAt,
  };
}

export async function consumeTenantOwnerActivation(input: {
  rawToken: string;
  passwordHash: string;
}) {
  const context = await resolveTenantOwnerActivation(
    input.rawToken,
  );

  if (!context) {
    throw new Error(
      "This activation link is invalid, expired, already used, or the account is already activated.",
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({
      where: { id: context.tokenId },
      select: { usedAt: true, expiresAt: true },
    });

    if (
      !token ||
      token.usedAt ||
      token.expiresAt.getTime() <= now.getTime()
    ) {
      throw new Error(
        "This activation link is invalid, expired, or already used.",
      );
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
        actorLabel: context.ownerEmail,
        action: "platform.tenant.owner.activation.completed",
        resourceType: "User",
        resourceId: context.userId,
        after: {
          emailVerified: true,
          membershipStatus: "ACTIVE",
          activatedAt: now.toISOString(),
        },
      },
    });

    return context;
  });
}

#!/usr/bin/env node
import fs from "node:fs";

function replaceBetween(source, startMarker, endMarker, replacement, path) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Could not locate repair boundaries in ${path}: ${startMarker} -> ${endMarker}`,
    );
  }

  return (
    source.slice(0, start) +
    replacement +
    "\n\n" +
    source.slice(end)
  );
}

function write(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Repaired: ${path}`);
}

// ---------------------------------------------------------------------
// 1. Schema repair.
// inviteMemberSchema no longer has temporaryPassword, therefore
// updateMembershipSchema must not attempt to omit it.
// ---------------------------------------------------------------------
write("src/modules/access/schemas.ts", (source) => {
  source = source.replace(
    /,\s*temporaryPassword:\s*true\s*/g,
    "",
  );

  source = source.replace(
    /^\s*temporaryPassword:\s*z\.string\(\)\.min\(12\)\.max\(128\),\s*$/gm,
    "",
  );

  return source;
});

// ---------------------------------------------------------------------
// 2. Replace only inviteMemberAction.
// Preserve updateMembershipAction and the resend/recovery actions.
// ---------------------------------------------------------------------
write("src/modules/access/actions.ts", (source) => {
  // Remove obsolete bcrypt import if still present.
  source = source.replace(
    `import { hash } from "bcryptjs";\n`,
    "",
  );

  if (
    !source.includes(
      `issueTenantUserActivationInvitation`,
    )
  ) {
    source = source.replace(
      `import { prisma } from "@/lib/prisma";`,
      `import { prisma } from "@/lib/prisma";
import {
  issueTenantUserActivationInvitation,
} from "@/core/tenant-user-activation/service";`,
    );
  }

  const replacement = `export async function inviteMemberAction(formData: FormData) {
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
}`;

  source = replaceBetween(
    source,
    "export async function inviteMemberAction",
    "export async function updateMembershipAction",
    replacement,
    "src/modules/access/actions.ts",
  );

  return source;
});

// ---------------------------------------------------------------------
// 3. Replace only issueTenantUserActivationInvitation.
// Keep the already-working resolve/consume tenant activation implementation.
// ---------------------------------------------------------------------
write(
  "src/core/tenant-user-activation/service.ts",
  (source) => {
    const replacement = `export async function issueTenantUserActivationInvitation(input: {
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
    \`\${baseUrl()}/activate-user-account?tenant=\${encodeURIComponent(
      membership.tenant.id,
    )}&token=\${encodeURIComponent(rawToken)}\`;

  const result =
    await resendClient().emails.send({
      from: fromAddress(),
      to: membership.user.email,
      subject:
        \`Activate your Enorsis account for \${membership.tenant.name}\`,
      html: \`
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#102a43">
          <p style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#1f5eff;text-transform:uppercase">Enorsis</p>
          <h1>Activate your account</h1>
          <p>Hello \${escapeHtml(
            membership.user.name ??
              "Enorsis User",
          )},</p>
          <p>You have been added to <strong>\${escapeHtml(
            membership.tenant.name,
          )}</strong> on Enorsis.</p>
          <p>Your assigned roles: <strong>\${escapeHtml(
            membership.roles.join(", "),
          )}</strong></p>
          <p style="margin:28px 0">
            <a href="\${escapeHtml(url)}"
               style="background:#102a43;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">
              Activate Enorsis Account
            </a>
          </p>
          <p>This secure link expires in \${TTL_HOURS} hours and can be used only once.</p>
        </div>
      \`,
      text:
        \`Activate your Enorsis account for \${membership.tenant.name}\\n\\n\` +
        \`\${url}\\n\\nThis link expires in \${TTL_HOURS} hours.\`,
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
}`;

    source = replaceBetween(
      source,
      "export async function issueTenantUserActivationInvitation",
      "export async function resolveTenantUserActivation",
      replacement,
      "src/core/tenant-user-activation/service.ts",
    );

    // Normalize the completion audit event name.
    source = source.replaceAll(
      `"platform.tenant.user.activation.completed"`,
      `"tenant.member.activation.completed"`,
    );

    return source;
  },
);

console.log(
  "B13.10.13b partial-install repair complete.",
);

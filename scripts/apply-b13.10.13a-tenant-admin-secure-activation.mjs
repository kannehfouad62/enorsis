#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

// ---------------------------------------------------------
// 1. Invite schema: remove administrator-created temporary password
// ---------------------------------------------------------
patch("src/modules/access/schemas.ts", (source) => {
  source = source.replace(
    `  temporaryPassword: z.string().min(12).max(128),\n`,
    "",
  );

  return source;
});

// ---------------------------------------------------------
// 2. Existing tenant-user activation service:
//    add token invalidation, email-sent evidence, and safe reset recovery
// ---------------------------------------------------------
patch("src/core/tenant-user-activation/service.ts", (source) => {
  source = source.replace(
    `export async function issueTenantUserActivationInvitation(input: {
tenantId: string;
userId: string;
actorUserId: string;
actorEmail: string;
}) {`,
    `export async function issueTenantUserActivationInvitation(input: {
tenantId: string;
userId: string;
actorUserId: string;
actorEmail: string;
resetCredentials?: boolean;
}) {`,
  );

  source = source.replace(
    `if (membership.user.passwordHash) {
throw new Error("This user already has login credentials.");
}

const rawToken = randomBytes(32).toString("base64url");`,
    `if (
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

if (membership.roles.length === 0) {
  throw new Error(
    "Assign at least one tenant role before sending activation.",
  );
}

const rawToken = randomBytes(32).toString("base64url");`,
  );

  source = source.replace(
    `await prisma.$transaction(async (tx) => {
await tx.passwordResetToken.create({`,
    `await prisma.$transaction(async (tx) => {
await tx.passwordResetToken.updateMany({
  where: {
    userId: membership.user.id,
    usedAt: null,
  },
  data: {
    usedAt: new Date(),
  },
});

if (input.resetCredentials) {
  await tx.user.update({
    where: { id: membership.user.id },
    data: {
      passwordHash: null,
      passwordChangedAt: null,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });
}

await tx.passwordResetToken.create({`,
  );

  source = source.replace(
    `    action: "platform.tenant.user.activation.invited",`,
    `    action: input.resetCredentials
      ? "tenant.member.activation.reset_invited"
      : "tenant.member.activation.invited",`,
  );

  source = source.replace(
    `      expiresAt: expiresAt.toISOString(),
    },`,
    `      expiresAt: expiresAt.toISOString(),
      credentialReset: Boolean(input.resetCredentials),
    },`,
  );

  source = source.replace(
    `if (result.error) {
throw new Error(result.error.message || "Resend failed to deliver the activation email.");
}

return {
expiresAt,
providerMessageId: result.data?.id ?? null,
};`,
    `if (result.error) {
await prisma.auditEvent.create({
  data: {
    tenantId: membership.tenant.id,
    userId: input.actorUserId,
    actorType: "USER",
    actorId: input.actorUserId,
    actorLabel: input.actorEmail,
    action: "tenant.member.activation.email.failed",
    resourceType: "User",
    resourceId: membership.user.id,
    outcome: "FAILURE",
    reason:
      result.error.message ||
      "Resend failed to deliver the activation email.",
    after: {
      userEmail: membership.user.email,
      expiresAt: expiresAt.toISOString(),
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
    action: "tenant.member.activation.email.sent",
    resourceType: "User",
    resourceId: membership.user.id,
    after: {
      userEmail: membership.user.email,
      providerMessageId: result.data?.id ?? null,
      expiresAt: expiresAt.toISOString(),
    },
  },
});

return {
expiresAt,
providerMessageId: result.data?.id ?? null,
};`,
  );

  source = source.replace(
    `    action: "platform.tenant.user.activation.completed",`,
    `    action: "tenant.member.activation.completed",`,
  );

  return source;
});

// ---------------------------------------------------------
// 3. Tenant access actions:
//    brand-new users become passwordless INVITED + receive activation email
//    existing credentialed Enorsis identities become ACTIVE without password reset
// ---------------------------------------------------------
patch("src/modules/access/actions.ts", (source) => {
  source = source.replace(
    `import { hash } from "bcryptjs";\n`,
    "",
  );

  if (!source.includes("@/core/tenant-user-activation/service")) {
    source = source.replace(
      `import { prisma } from "@/lib/prisma";`,
      `import { prisma } from "@/lib/prisma";
import {
  issueTenantUserActivationInvitation,
} from "@/core/tenant-user-activation/service";`,
    );
  }

  source = source.replace(
    `    temporaryPassword: value(formData, "temporaryPassword"),\n`,
    "",
  );

  source = source.replace(
    `  assertSegregationOfDuties(input.roles);
  const passwordHash = await hash(input.temporaryPassword, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
        isActive: true,
      },
      create: {
        email: input.email,
        name: input.name,
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        isActive: true,
      },
    });`,
    `  assertSegregationOfDuties(input.roles);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  const result = await prisma.$transaction(async (tx) => {
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

    const hasExistingCredentials =
      Boolean(existingUser?.passwordHash);`,
  );

  source = source.replace(
    `      update: {
        status: MembershipStatus.INVITED,`,
    `      update: {
        status: hasExistingCredentials
          ? MembershipStatus.ACTIVE
          : MembershipStatus.INVITED,`,
  );

  source = source.replace(
    `        invitedAt: new Date(),
      },
      create: {
        tenantId: actor.tenantId,
        userId: user.id,
        status: MembershipStatus.INVITED,`,
    `        invitedAt: new Date(),
        activatedAt: hasExistingCredentials
          ? new Date()
          : null,
      },
      create: {
        tenantId: actor.tenantId,
        userId: user.id,
        status: hasExistingCredentials
          ? MembershipStatus.ACTIVE
          : MembershipStatus.INVITED,`,
  );

  source = source.replace(
    `        invitedByUserId: actor.id,
      },
    });`,
    `        invitedByUserId: actor.id,
        activatedAt: hasExistingCredentials
          ? new Date()
          : null,
      },
    });`,
  );

  const auditTail = `        action: "membership.invite",
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
}`;

  const auditTailReplacement = `        action: hasExistingCredentials
          ? "membership.access_added_existing_user"
          : "membership.invite",
        resourceType: "Membership",
        resourceId: membership.id,
        after: {
          email: input.email,
          roles: input.roles,
          approvalLimitUsd: input.approvalLimitUsd,
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
  });

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

  if (source.includes(auditTail)) {
    source = source.replace(
      auditTail,
      auditTailReplacement,
    );
  }

  if (!source.includes("resendMemberActivationAction")) {
    source += `

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
`;
  }

  return source;
});

// ---------------------------------------------------------
// 4. Tenant Access UI:
//    no temporary password, add resend/recovery controls
// ---------------------------------------------------------
patch("src/app/app/settings/access/page.tsx", (source) => {
  source = source.replace(
    `import { inviteMemberAction, updateMembershipAction } from "@/modules/access/actions";`,
    `import {
  inviteMemberAction,
  resendMemberActivationAction,
  resetAndResendMemberActivationAction,
  updateMembershipAction,
} from "@/modules/access/actions";`,
  );

  source = source.replace(
    `          <Field label="Temporary password"><input className={inputClass} name="temporaryPassword" type="password" minLength={12} required /></Field>\n`,
    "",
  );

  source = source.replace(
    `        Govern who can request, source, approve, contract and audit procurement activity across the organization.`,
    `        Govern who can request, source, approve, contract and audit procurement activity across the organization. New users receive a secure single-use activation email and create their own password.`,
  );

  const scopeBlock = `            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ScopeSelect name="legalEntityScopeIds" label="Legal entity scope" options={tenant.legalEntities} selected={membership.legalEntityScopeIds} />
              <ScopeSelect name="siteScopeIds" label="Site scope" options={tenant.sites} selected={membership.siteScopeIds} />
              <ScopeSelect name="departmentScopeIds" label="Department scope" options={tenant.departments} selected={membership.departmentScopeIds} />
            </div>
          </form>`;

  const replacement = `            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ScopeSelect name="legalEntityScopeIds" label="Legal entity scope" options={tenant.legalEntities} selected={membership.legalEntityScopeIds} />
              <ScopeSelect name="siteScopeIds" label="Site scope" options={tenant.sites} selected={membership.siteScopeIds} />
              <ScopeSelect name="departmentScopeIds" label="Department scope" options={tenant.departments} selected={membership.departmentScopeIds} />
            </div>

            {membership.status === "INVITED" ? (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Secure activation
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {membership.user.passwordHash
                    ? "This invited membership already has credentials. Reset the inconsistent credential state and send a fresh activation link."
                    : "The user has not activated yet. Send a fresh single-use activation link."}
                </p>

                {membership.user.passwordHash ? (
                  <button
                    formAction={resetAndResendMemberActivationAction}
                    className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-800"
                    type="submit"
                  >
                    Reset & resend activation
                  </button>
                ) : (
                  <button
                    formAction={resendMemberActivationAction}
                    className="mt-3 rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white"
                    type="submit"
                  >
                    Resend activation
                  </button>
                )}
              </div>
            ) : null}
          </form>`;

  if (source.includes(scopeBlock)) {
    source = source.replace(
      scopeBlock,
      replacement,
    );
  }

  return source;
});

console.log(
  "B13.10.13a incremental tenant-admin secure activation integration complete.",
);

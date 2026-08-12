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

patch("src/modules/platform-tenants/schemas.ts", (source) => {
  if (!source.includes("updatePlatformTenantMemberRolesSchema")) {
    source += `

const tenantAssignableRole = z.enum([
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
]);

export const updatePlatformTenantMemberRolesSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  roles: z.array(tenantAssignableRole).min(
    1,
    "Assign at least one tenant role before activation.",
  ),
});
`;
  }
  return source;
});

patch("src/modules/platform-tenants/actions.ts", (source) => {
  if (!source.includes("updatePlatformTenantMemberRolesSchema")) {
    source = source.replace(
      `  updatePlatformTenantCommercialPersonaSchema,
} from "./schemas";`,
      `  updatePlatformTenantCommercialPersonaSchema,
  updatePlatformTenantMemberRolesSchema,
} from "./schemas";`,
    );
  }

  if (!source.includes("updatePlatformTenantMemberRolesAction")) {
    source += `

export async function updatePlatformTenantMemberRolesAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();

  const input = updatePlatformTenantMemberRolesSchema.parse({
    tenantId: value(formData, "tenantId"),
    userId: value(formData, "userId"),
    roles: formData.getAll("roles").map((role) => String(role)),
  });

  const membership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!membership) {
    throw new Error("The selected user is not a member of this tenant.");
  }

  if (membership.roles.includes(PlatformRole.TENANT_OWNER)) {
    throw new Error(
      "Tenant Owner roles are managed through the Tenant Owner controls.",
    );
  }

  const updated = await prisma.membership.update({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    data: {
      roles: input.roles as PlatformRole[],
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.member.roles.update",
      resourceType: "Membership",
      resourceId: membership.id,
      before: { roles: membership.roles },
      after: {
        roles: updated.roles,
        memberEmail: membership.user.email,
      },
    },
  });

  revalidatePath(\`/app/settings/tenants/\${input.tenantId}\`);
}
`;
  }

  const needle = `  if (membership.user.passwordHash) {
    throw new Error("This user already has login credentials.");
  }

  await issueTenantUserActivationInvitation({`;

  const replacement = `  if (membership.user.passwordHash) {
    throw new Error("This user already has login credentials.");
  }

  if (membership.roles.length === 0) {
    throw new Error(
      "Assign at least one tenant role before sending the activation invitation.",
    );
  }

  if (
    membership.roles.includes(PlatformRole.PLATFORM_SUPER_ADMIN) ||
    membership.roles.includes(PlatformRole.PLATFORM_SUPPORT)
  ) {
    throw new Error(
      "Platform-level roles cannot be activated through tenant member provisioning.",
    );
  }

  await issueTenantUserActivationInvitation({`;

  if (
    source.includes(needle) &&
    !source.includes("Assign at least one tenant role before sending")
  ) {
    source = source.replace(needle, replacement);
  }

  return source;
});

patch("src/app/app/settings/tenants/[id]/page.tsx", (source) => {
  if (!source.includes("updatePlatformTenantMemberRolesAction")) {
    source = source.replace(
      `  updatePlatformTenantCommercialPersonaAction,
} from "@/modules/platform-tenants/actions";`,
      `  updatePlatformTenantCommercialPersonaAction,
  updatePlatformTenantMemberRolesAction,
} from "@/modules/platform-tenants/actions";`,
    );
  }

  if (!source.includes("TENANT_ASSIGNABLE_ROLES")) {
    source = source.replace(
      `const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";`,
      `const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const TENANT_ASSIGNABLE_ROLES = [
  ["TENANT_ADMIN", "Tenant Admin"],
  ["PROCUREMENT_EXECUTIVE", "Procurement Executive"],
  ["PROCUREMENT_MANAGER", "Procurement Manager"],
  ["BUYER", "Buyer"],
  ["REQUESTER", "Requester"],
  ["APPROVER", "Approver"],
  ["FINANCE", "Finance / Accounts Payable"],
  ["SUPPLIER_MANAGER", "Supplier Manager"],
  ["RISK_COMPLIANCE", "Risk & Compliance"],
  ["AUDITOR", "Auditor"],
  ["VIEWER", "Viewer"],
] as const;`,
    );
  }

  const old = `                {!membership.user.passwordHash ? (
                  <form action={sendTenantMemberActivationAction}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="userId" value={membership.user.id} />
                    <button className="rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white">
                      {membership.status === "INVITED"
                        ? "Resend activation invitation"
                        : "Send activation invitation"}
                    </button>
                  </form>
                ) : null}`;

  const updated = `                {!membership.roles.includes("TENANT_OWNER") ? (
                  <div className="w-full border-t border-slate-100 pt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Tenant access roles
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Assign one or more roles before sending the activation invitation.
                    </p>

                    <form
                      action={updatePlatformTenantMemberRolesAction}
                      className="mt-3"
                    >
                      <input type="hidden" name="tenantId" value={tenant.id} />
                      <input type="hidden" name="userId" value={membership.user.id} />

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {TENANT_ASSIGNABLE_ROLES.map(([role, label]) => (
                          <label
                            key={role}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            <input
                              type="checkbox"
                              name="roles"
                              value={role}
                              defaultChecked={membership.roles.includes(role)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <button className="mt-3 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white">
                        Save assigned roles
                      </button>
                    </form>
                  </div>
                ) : null}

                {!membership.user.passwordHash ? (
                  <form action={sendTenantMemberActivationAction} className="mt-3">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="userId" value={membership.user.id} />
                    <button
                      disabled={
                        !membership.roles.includes("TENANT_OWNER") &&
                        membership.roles.length === 0
                      }
                      className="rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {membership.status === "INVITED"
                        ? "Resend activation invitation"
                        : "Send activation invitation"}
                    </button>
                  </form>
                ) : null}`;

  if (source.includes(old)) {
    source = source.replace(old, updated);
  }

  return source;
});

console.log("B13.10.6 pre-activation tenant role assignment integration complete.");

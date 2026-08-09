#!/usr/bin/env node
import fs from "node:fs";

const actionsPath =
  "src/modules/platform-tenants/actions.ts";
const detailPath =
  "src/app/app/settings/tenants/[id]/page.tsx";

let actions = fs.readFileSync(actionsPath, "utf8");

if (
  !actions.includes(
    "@/core/tenant-owner-activation/service",
  )
) {
  actions = actions.replace(
    'import { auth } from "@/auth";',
    'import { auth } from "@/auth";\nimport { issueTenantOwnerActivationInvitation } from "@/core/tenant-owner-activation/service";',
  );
}

const oldOwner = `    const owner = await tx.user.upsert({
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
    });`;

const newOwner = `    const owner = await tx.user.upsert({
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
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });`;

if (actions.includes(oldOwner)) {
  actions = actions.replace(oldOwner, newOwner);
}

const oldMembership = `    await tx.membership.upsert({
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
    });`;

const newMembership = `    const ownerNeedsActivation = !owner.passwordHash;

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: owner.id,
        },
      },
      update: {
        status: ownerNeedsActivation
          ? MembershipStatus.INVITED
          : MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: ownerNeedsActivation ? null : new Date(),
        invitedByUserId: actor.id,
      },
      create: {
        tenantId: tenant.id,
        userId: owner.id,
        status: ownerNeedsActivation
          ? MembershipStatus.INVITED
          : MembershipStatus.ACTIVE,
        roles: [PlatformRole.TENANT_OWNER, PlatformRole.TENANT_ADMIN],
        activatedAt: ownerNeedsActivation ? null : new Date(),
        invitedByUserId: actor.id,
      },
    });`;

if (actions.includes(oldMembership)) {
  actions = actions.replace(
    oldMembership,
    newMembership,
  );
}

const oldReturn = `    return tenant;
  });

  revalidatePath("/app/settings/tenants");
  redirect(\`/app/settings/tenants/\${result.id}\`);`;

const newReturn = `    return {
      tenant,
      owner,
      ownerNeedsActivation,
    };
  });

  if (result.ownerNeedsActivation) {
    await issueTenantOwnerActivationInvitation({
      tenantId: result.tenant.id,
      userId: result.owner.id,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });
  }

  revalidatePath("/app/settings/tenants");
  redirect(\`/app/settings/tenants/\${result.tenant.id}\`);`;

if (actions.includes(oldReturn)) {
  actions = actions.replace(oldReturn, newReturn);
}

if (
  !actions.includes(
    "resendTenantOwnerActivationAction",
  )
) {
  actions += `

export async function resendTenantOwnerActivationAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");

  if (!tenantId) {
    throw new Error("Tenant is required.");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId,
      roles: { has: PlatformRole.TENANT_OWNER },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new Error(
      "No Tenant Owner membership exists for this tenant.",
    );
  }

  if (membership.user.passwordHash) {
    throw new Error(
      "The Tenant Owner already has login credentials.",
    );
  }

  await issueTenantOwnerActivationInvitation({
    tenantId,
    userId: membership.user.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
  });

  revalidatePath(
    \`/app/settings/tenants/\${tenantId}\`,
  );
}
`;
}

fs.writeFileSync(actionsPath, actions);

let detail = fs.readFileSync(detailPath, "utf8");

if (
  !detail.includes(
    "resendTenantOwnerActivationAction",
  )
) {
  detail = detail.replace(
    `  assignPlatformTenantOwnerAction,
  updatePlatformTenantStatusAction,`,
    `  assignPlatformTenantOwnerAction,
  resendTenantOwnerActivationAction,
  updatePlatformTenantStatusAction,`,
  );
}

const anchor = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Assign / replace tenant owner</h2>`;

if (
  !detail.includes("Tenant Owner access") &&
  detail.includes(anchor)
) {
  const section = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Tenant Owner access</h2>

        {owner ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="font-black">
                {owner.user.name ?? owner.user.email}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {owner.user.email}
              </p>
              <p className="mt-3 text-xs font-bold uppercase text-slate-500">
                Membership: {owner.status}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Credential status
              </p>
              <p className="mt-2 text-lg font-black">
                {owner.user.passwordHash
                  ? "Password configured"
                  : "Awaiting activation"}
              </p>

              {!owner.user.passwordHash ? (
                <form
                  action={resendTenantOwnerActivationAction}
                  className="mt-4"
                >
                  <input
                    type="hidden"
                    name="tenantId"
                    value={tenant.id}
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                    {owner.status === "INVITED"
                      ? "Resend activation invitation"
                      : "Send activation invitation"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No Tenant Owner is assigned.
          </p>
        )}
      </section>

`;

  detail = detail.replace(
    anchor,
    section + anchor,
  );
}

fs.writeFileSync(detailPath, detail);

console.log(
  "Integrated B13.10.1 Tenant Owner secure activation.",
);

#!/usr/bin/env node
import fs from "node:fs";

const actionsPath = "src/modules/platform-tenants/actions.ts";
const detailPath = "src/app/app/settings/tenants/[id]/page.tsx";

let actions = fs.readFileSync(actionsPath, "utf8");

if (!actions.includes("@/core/tenant-user-activation/service")) {
  actions = actions.replace(
    'import { auth } from "@/auth";',
    'import { auth } from "@/auth";\nimport { issueTenantUserActivationInvitation } from "@/core/tenant-user-activation/service";',
  );
}

if (!actions.includes("sendTenantMemberActivationAction")) {
  actions += `

export async function sendTenantMemberActivationAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");
  const userId = value(formData, "userId");

  if (!tenantId || !userId) {
    throw new Error("Tenant and user are required.");
  }

  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("The selected user is not a member of this tenant.");
  }

  if (membership.user.passwordHash) {
    throw new Error("This user already has login credentials.");
  }

  await issueTenantUserActivationInvitation({
    tenantId,
    userId,
    actorUserId: actor.id,
    actorEmail: actor.email,
  });

  revalidatePath(\`/app/settings/tenants/\${tenantId}\`);
}
`;
}

fs.writeFileSync(actionsPath, actions);

let detail = fs.readFileSync(detailPath, "utf8");

if (!detail.includes("sendTenantMemberActivationAction")) {
  detail = detail.replace(
    "  assignPlatformTenantOwnerAction,",
    "  assignPlatformTenantOwnerAction,\n  sendTenantMemberActivationAction,",
  );
}

const oldBlock = `          {tenant.memberships.map((membership) => (
            <div
              key={membership.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <p className="font-black">
                {membership.user.name ?? membership.user.email}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {membership.user.email}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {membership.roles.join(" · ")} · {membership.status}
              </p>
            </div>
          ))}`;

const newBlock = `          {tenant.memberships.map((membership) => (
            <div
              key={membership.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-black">
                    {membership.user.name ?? membership.user.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {membership.user.email}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {membership.roles.join(" · ")} · {membership.status}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {membership.user.passwordHash
                      ? "Credentials configured"
                      : "Awaiting account activation"}
                  </p>
                </div>

                {!membership.user.passwordHash ? (
                  <form action={sendTenantMemberActivationAction}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="userId" value={membership.user.id} />
                    <button className="rounded-xl bg-blue-700 px-4 py-3 text-xs font-black text-white">
                      {membership.status === "INVITED"
                        ? "Resend activation invitation"
                        : "Send activation invitation"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}`;

if (detail.includes(oldBlock)) {
  detail = detail.replace(oldBlock, newBlock);
} else if (!detail.includes("Awaiting account activation")) {
  throw new Error("Could not locate tenant Members block.");
}

fs.writeFileSync(detailPath, detail);

console.log("Integrated B13.10.2 tenant-user activation controls.");

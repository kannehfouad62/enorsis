import { notFound } from "next/navigation";
import {
  assignPlatformTenantOwnerAction,
  sendTenantMemberActivationAction,
  resendTenantOwnerActivationAction,
  updatePlatformTenantStatusAction,
  updatePlatformTenantCommercialPersonaAction,
  runPlatformTenantAccessAuditAction,
  updatePlatformTenantMemberRolesAction,
} from "@/modules/platform-tenants/actions";
import { getPlatformTenantDetail } from "@/modules/platform-tenants/queries";
import { auditTenantAccess } from "@/core/access-governance/tenant-role-audit";

const card =
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
] as const;

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);

  if (!tenant) {
    notFound();
  }

  const owner = tenant.memberships.find((membership) =>
    membership.roles.includes("TENANT_OWNER"),
  );

  const accessAudit = auditTenantAccess({
    commercialPersona: tenant.commercialPersona,
    members: tenant.memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      status: membership.status,
      roles: membership.roles,
      hasPassword: Boolean(membership.user.passwordHash),
    })),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Platform Tenant Administration
      </p>
      <h1 className="mt-3 text-4xl font-black">{tenant.name}</h1>
      <p className="mt-2 text-slate-600">{tenant.slug}</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Status" value={tenant.status} />
        <Metric label="Members" value={String(tenant.memberships.length)} />
        <Metric label="Legal entities" value={String(tenant.legalEntities.length)} />
        <Metric label="Sites" value={String(tenant.sites.length)} />
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Tenant identity</h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <Item label="Legal name" value={tenant.legalName ?? "—"} />
          <Item label="Country" value={tenant.countryCode ?? "—"} />
          <Item
            label="Commercial persona"
            value={tenant.commercialPersona.replaceAll("_", " + ")}
          />
          <Item label="Locale" value={tenant.defaultLocale} />
          <Item label="Time zone" value={tenant.defaultTimeZone} />
          <Item label="Currency policy" value={tenant.currencyPolicyMode} />
          <Item label="Base currency" value={tenant.baseCurrencyCode} />
          <Item label="Tenant owner" value={owner?.user.email ?? "Not assigned"} />
          <Item label="Created" value={tenant.createdAt.toLocaleString()} />
        </dl>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Update commercial classification</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Classification controls the tenant's commercial workspace,
          module visibility and protected buyer/supplier route access.
        </p>
        <form
          action={updatePlatformTenantCommercialPersonaAction}
          className="mt-5 flex flex-wrap gap-3"
        >
          <input type="hidden" name="tenantId" value={tenant.id} />
          <select
            name="commercialPersona"
            defaultValue={tenant.commercialPersona}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3"
          >
            <option value="BUYER">Buyer</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="BUYER_SUPPLIER">Buyer + Supplier</option>
          </select>
          <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
            Update classification
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Lifecycle control</h2>
        <form action={updatePlatformTenantStatusAction} className="mt-5 flex flex-wrap gap-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <select
            name="status"
            defaultValue={tenant.status}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PROVISIONING">PROVISIONING</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Update status
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
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

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Assign / replace tenant owner</h2>
        <form action={assignPlatformTenantOwnerAction} className="mt-5 grid gap-4 md:grid-cols-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Field label="Owner name" name="ownerName" required />
          <Field label="Owner email" name="ownerEmail" type="email" required />
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Assign owner
            </button>
          </div>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Members</h2>
        <div className="mt-5 space-y-3">
          {tenant.memberships.map((membership) => (
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

                {!membership.roles.includes("TENANT_OWNER") ? (
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
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">User access & role audit</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review the access posture of all existing tenant members. This audit
              is non-destructive: findings identify role and activation risks but
              never change access automatically.
            </p>
          </div>

          <form action={runPlatformTenantAccessAuditAction}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Record access audit
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Reviewed" value={String(accessAudit.reviewed)} />
          <Metric label="Passed" value={String(accessAudit.passed)} />
          <Metric label="Warnings" value={String(accessAudit.warnings)} />
          <Metric label="Failed" value={String(accessAudit.failed)} />
        </div>

        <div className="mt-6 space-y-3">
          {accessAudit.results.map((result) => (
            <article
              key={result.userId}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    {result.name ?? result.email ?? result.userId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {result.email ?? "No email"} · {result.status}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-600">
                    {result.roles.length > 0
                      ? result.roles.join(" · ")
                      : "No roles assigned"}
                  </p>
                </div>

                <span
                  className={
                    result.severity === "PASS"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                      : result.severity === "WARN"
                        ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                        : "rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                  }
                >
                  {result.severity}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {result.findings.map((finding) => (
                  <p
                    key={finding.code}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"
                  >
                    <strong>{finding.code.replaceAll("_", " ")}:</strong>{" "}
                    {finding.message}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Transaction footprint</h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          <Item label="Suppliers" value={String(tenant._count.suppliers)} />
          <Item label="Purchase requests" value={String(tenant._count.purchaseRequests)} />
          <Item label="Purchase orders" value={String(tenant._count.purchaseOrders)} />
          <Item label="Invoices" value={String(tenant._count.supplierInvoices)} />
          <Item label="Payment batches" value={String(tenant._count.paymentBatches)} />
          <Item label="Inventory items" value={String(tenant._count.inventoryItems)} />
        </dl>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
      />
    </label>
  );
}

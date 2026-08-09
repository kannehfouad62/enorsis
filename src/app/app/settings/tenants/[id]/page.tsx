import { notFound } from "next/navigation";
import {
  assignPlatformTenantOwnerAction,
  resendTenantOwnerActivationAction,
  updatePlatformTenantStatusAction,
} from "@/modules/platform-tenants/actions";
import { getPlatformTenantDetail } from "@/modules/platform-tenants/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

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
          <Item label="Locale" value={tenant.defaultLocale} />
          <Item label="Time zone" value={tenant.defaultTimeZone} />
          <Item label="Currency policy" value={tenant.currencyPolicyMode} />
          <Item label="Base currency" value={tenant.baseCurrencyCode} />
          <Item label="Tenant owner" value={owner?.user.email ?? "Not assigned"} />
          <Item label="Created" value={tenant.createdAt.toLocaleString()} />
        </dl>
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

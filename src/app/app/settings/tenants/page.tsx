import Link from "next/link";
import {
  Building2,
  CirclePause,
  CircleCheckBig,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { createPlatformTenantAction } from "@/modules/platform-tenants/actions";
import { getPlatformTenantDirectory } from "@/modules/platform-tenants/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlatformTenantAdministrationPage() {
  const data = await getPlatformTenantDirectory();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Platform Administration
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Tenant Administration
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Provision and govern independent Enorsis customer tenants.
            This control plane is restricted to Platform Super Admin.
          </p>
        </div>

        <a
          href="#create-tenant"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          <Plus className="h-4 w-4" />
          Create tenant
        </a>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total" value={data.metrics.total} />
        <Metric label="Active" value={data.metrics.active} />
        <Metric label="Provisioning" value={data.metrics.provisioning} />
        <Metric label="Suspended" value={data.metrics.suspended} />
        <Metric label="Archived" value={data.metrics.archived} />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">Tenant directory</h2>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Tenant</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3">Currency</th>
                <th className="px-3 py-3">Members</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-3 py-4">
                    <p className="font-black">{tenant.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{tenant.slug}</p>
                  </td>
                  <td className="px-3 py-4">{tenant.status}</td>
                  <td className="px-3 py-4">{tenant.countryCode ?? "—"}</td>
                  <td className="px-3 py-4">{tenant.baseCurrencyCode}</td>
                  <td className="px-3 py-4">{tenant._count.memberships}</td>
                  <td className="px-3 py-4">
                    {tenant.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4">
                    <Link
                      href={`/app/settings/tenants/${tenant.id}`}
                      className="font-black text-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="create-tenant" className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create independent tenant</h2>
        <p className="mt-2 text-sm text-slate-600">
          Creates a new Enorsis isolation boundary and assigns its first
          Tenant Owner / Tenant Admin membership.
        </p>

        <form action={createPlatformTenantAction} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Organization name" name="name" required />
          <Field label="Legal name" name="legalName" required />
          <Field label="Tenant slug" name="slug" placeholder="atlas-global-industries" required />
          <Field label="Country code" name="countryCode" placeholder="US" required />
          <Field label="Default locale" name="defaultLocale" defaultValue="en-US" required />
          <Field label="Time zone" name="defaultTimeZone" defaultValue="America/Chicago" required />

          <label className="text-sm font-bold text-slate-700">
            Currency policy
            <select
              name="currencyPolicyMode"
              defaultValue="USD_ONLY"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950"
            >
              <option value="USD_ONLY">USD only</option>
              <option value="USD_WITH_LOCAL_DISPLAY">USD with local display</option>
              <option value="TENANT_BASE_CURRENCY">Tenant base currency</option>
            </select>
          </label>

          <Field label="Base currency" name="baseCurrencyCode" defaultValue="USD" required />
          <Field label="Local display currency" name="localDisplayCurrency" placeholder="Optional" />
          <Field label="Tenant owner name" name="ownerName" required />
          <Field label="Tenant owner email" name="ownerEmail" type="email" required />

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="activateImmediately" defaultChecked />
            Activate tenant immediately
          </label>

          <div className="md:col-span-2">
            <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Create tenant
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

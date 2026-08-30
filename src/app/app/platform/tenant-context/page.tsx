import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import { switchPlatformTenantContextAction } from "@/modules/platform-tenant-context/actions";
import { getPlatformTenantContextWorkspace } from "@/modules/platform-tenant-context/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlatformTenantContextPage() {
  const data = await getPlatformTenantContextWorkspace();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Platform administration
        </p>
        <h1 className="mt-3 text-4xl font-black">Active Tenant Context</h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Switch the tenant context used by Enorsis while retaining your
          PLATFORM_SUPER_ADMIN identity. Tenant-scoped pages and authorization
          checks will operate against the selected tenant.
        </p>
      </div>

      <section className={`${card} mt-8 border-blue-200 bg-blue-50`}>
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-blue-700" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Current context
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {data.session.user.tenantName}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {data.activeTenant
                ? `${formatPersona(data.activeTenant.commercialPersona)} · ${data.activeTenant.slug}`
                : data.session.user.tenantId}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Available active tenants</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select a tenant to enter its governed buyer or supplier workspace.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.tenants.map((tenant) => {
            const active = tenant.id === data.session.user.tenantId;

            return (
              <article key={tenant.id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <Building2 className="h-6 w-6 text-blue-700" />
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-lg font-black">{tenant.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {tenant.legalName ?? tenant.name}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Commercial persona
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-800">
                    {formatPersona(tenant.commercialPersona)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {tenant.countryCode ?? "Country not configured"} · {tenant.slug}
                  </p>
                </div>

                {!active ? (
                  <form action={switchPlatformTenantContextAction} className="mt-5">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
                      Switch to this tenant
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-700">
                    Current tenant context
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatPersona(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" + ");
}

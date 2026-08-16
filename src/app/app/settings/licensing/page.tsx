import {
  assignTenantEditionAction,
  seedLicensingCatalogAction,
  setTenantEntitlementAction,
} from "@/modules/licensing/actions";
import { getLicensingAdministration } from "@/modules/licensing/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function LicensingPage() {
  const data = await getLicensingAdministration();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Licensing & Entitlements
      </h1>

      <form action={seedLicensingCatalogAction} className="mt-6">
        <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Initialize or refresh catalog
        </button>
      </form>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Commercial editions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.editions.map((edition) => (
            <article key={edition.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{edition.code}</p>
              <h3 className="mt-2 text-lg font-black">{edition.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {edition.features.filter((item) => item.enabled).length} enabled
                features
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Tenant licensing</h2>
        <div className="mt-5 space-y-5">
          {data.tenants.map((tenant) => (
            <article key={tenant.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {tenant.subscriptions[0]?.edition.code ?? "UNLICENSED"}
              </p>
              <h3 className="mt-2 text-lg font-black">{tenant.name}</h3>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <form action={assignTenantEditionAction} className="grid gap-3">
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <select className={input} name="editionId" required>
                    <option value="">Select edition</option>
                    {data.editions.map((edition) => (
                      <option key={edition.id} value={edition.id}>
                        {edition.name}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Assign edition
                  </button>
                </form>

                <form action={setTenantEntitlementAction} className="grid gap-3">
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <select className={input} name="featureId" required>
                    <option value="">Select feature override</option>
                    {data.features.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.groupKey} — {feature.name}
                      </option>
                    ))}
                  </select>
                  <select className={input} name="effect">
                    <option>ALLOW</option>
                    <option>DENY</option>
                  </select>
                  <input className={input} name="reason" placeholder="Override reason" />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                    Save entitlement
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

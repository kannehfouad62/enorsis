import Link from "next/link";
import {
  BadgeCheck,
  Globe2,
  Search,
  Store,
} from "lucide-react";
import {
  upsertMarketplaceProfileAction,
  verifyMarketplaceSupplierAction,
} from "@/modules/marketplace-suppliers/actions";
import { getMarketplaceSupplierDiscovery } from "@/modules/marketplace-suppliers/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    country?: string;
    industry?: string;
    category?: string;
    verification?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getMarketplaceSupplierDiscovery(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B7.1 · Procurement Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Supplier Discovery & Global Search
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Discover marketplace-visible suppliers by geography,
            industry, category, capabilities and verification
            status while preserving the existing supplier master as
            the system of record.
          </p>
        </div>
        <Link
          href="/app/suppliers"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Supplier Master
        </Link>
      </div>

      <form className={`${card} mt-8 grid gap-3 md:grid-cols-5`}>
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className={`${input} w-full pl-9`}
            name="q"
            defaultValue={params.q}
            placeholder="Supplier, capability, keyword..."
          />
        </div>
        <input
          className={input}
          name="country"
          defaultValue={params.country}
          placeholder="Country"
        />
        <input
          className={input}
          name="industry"
          defaultValue={params.industry}
          placeholder="Industry"
        />
        <input
          className={input}
          name="category"
          defaultValue={params.category}
          placeholder="Category"
        />
        <select
          className={input}
          name="verification"
          defaultValue={params.verification ?? ""}
        >
          <option value="">Any verification</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white md:col-span-5">
          Search marketplace
        </button>
      </form>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.results.map((result) => {
          if (!result) return null;
          const { supplier, profile } = result;

          return (
            <article key={profile.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <Store className="h-6 w-6 text-blue-700" />
                {profile.verificationStatus === "VERIFIED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {profile.verificationStatus}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-xl font-black">
                {supplier.tradingName ?? supplier.legalName}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {supplier.supplierNumber}
              </p>
              <p className="mt-3 text-sm font-bold text-slate-700">
                {profile.headline ?? "Marketplace supplier"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {profile.description ?? "No marketplace description."}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Globe2 className="h-3.5 w-3.5" />
                {profile.headquartersCountry ?? "Location not specified"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...result.industries, ...result.categories]
                  .slice(0, 6)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <Metric
                  label="Marketplace"
                  value={profile.marketplaceScore}
                />
                <Metric
                  label="Performance"
                  value={profile.performanceScore}
                />
                <Metric
                  label="Risk"
                  value={profile.riskScore}
                />
              </div>

              <Link
                href={`/app/suppliers/${supplier.id}`}
                className="mt-5 block rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-black"
              >
                View supplier
              </Link>
            </article>
          );
        })}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Marketplace profile administration
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Publish an existing supplier into the tenant marketplace
          discovery layer.
        </p>

        <form
          action={upsertMarketplaceProfileAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName} ·{" "}
                {supplier.supplierNumber}
              </option>
            ))}
          </select>
          <select
            className={input}
            name="marketplaceVisible"
            defaultValue="true"
          >
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
          <select
            className={input}
            name="verificationStatus"
            defaultValue="UNVERIFIED"
          >
            <option value="UNVERIFIED">Unverified</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <input className={input} name="headline" placeholder="Marketplace headline" />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Supplier marketplace description" />
          <input className={input} name="websiteUrl" placeholder="Website URL" />
          <input className={input} name="headquartersCountry" placeholder="Headquarters country" />
          <input className={input} name="countriesServed" placeholder="Countries served, comma separated" />
          <input className={input} name="industries" placeholder="Industries, comma separated" />
          <input className={input} name="categories" placeholder="Categories, comma separated" />
          <input className={input} name="capabilities" placeholder="Capabilities, comma separated" />
          <input className={input} name="certifications" placeholder="Certifications, comma separated" />
          <input className={input} name="keywords" placeholder="Search keywords, comma separated" />
          <input className={input} name="preferredCurrency" defaultValue="USD" maxLength={3} />
          <input className={input} name="leadTimeDays" type="number" min="0" placeholder="Lead time days" />
          <input className={input} name="employeeBand" placeholder="Employee band" />
          <input className={input} name="annualRevenueBand" placeholder="Annual revenue band" />
          <input className={input} name="sustainabilityTags" placeholder="Sustainability tags" />
          <input className={input} name="diversityTags" placeholder="Diversity tags" />
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white md:col-span-2">
            Save marketplace profile
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Verification administration
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Verification is governed and separate from marketplace
          visibility.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.results.map((result) => {
            if (!result) return null;
            return (
              <form
                key={result.profile.id}
                action={verifyMarketplaceSupplierAction}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <input
                  type="hidden"
                  name="profileId"
                  value={result.profile.id}
                />
                <p className="font-black">
                  {result.supplier.tradingName ??
                    result.supplier.legalName}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    name="status"
                    value="VERIFIED"
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Verify
                  </button>
                  <button
                    name="status"
                    value="PENDING"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
                  >
                    Pending
                  </button>
                  <button
                    name="status"
                    value="SUSPENDED"
                    className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Suspend
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const numeric =
    value === null || value === undefined
      ? "—"
      : Number(value).toFixed(1);

  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="font-black">{numeric}</p>
      <p className="mt-1 text-[10px] uppercase text-slate-500">
        {label}
      </p>
    </div>
  );
}

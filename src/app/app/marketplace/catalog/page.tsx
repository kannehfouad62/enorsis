import Link from "next/link";
import {
  BadgeDollarSign,
  Boxes,
  PackageSearch,
  Search,
  Star,
  Store,
} from "lucide-react";
import {
  createMarketplaceOfferingAction,
  deleteMarketplaceOfferingImageAction,
  setMarketplaceOfferingPrimaryImageAction,
  updateMarketplaceOfferingStatusAction,
} from "@/modules/marketplace-catalog/actions";
import { MarketplaceComparisonResults } from "@/components/marketplace/MarketplaceComparisonResults";
import { MarketplaceDirectImageUpload } from "@/components/marketplace/MarketplaceDirectImageUpload";
import { MarketplaceCartLink } from "@/components/marketplace/MarketplaceCartLink";
import { MarketplaceVendorDirectory } from "@/components/marketplace/MarketplaceVendorDirectory";
import { getMarketplaceCatalog } from "@/modules/marketplace-catalog/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function MarketplaceCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    availability?: string;
    vendor?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getMarketplaceCatalog(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B7.2 · Procurement Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Product Catalog & Supplier Offerings
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Publish and discover supplier products and services
            without replacing Enorsis guided buying or the supplier
            master.
          </p>
        </div>
        {data.commercialPersona !== "SUPPLIER" ? (
          <div className="flex flex-wrap gap-2">
            <MarketplaceCartLink />
            <Link
              href="/app/marketplace/suppliers"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Supplier Discovery
            </Link>
            <Link
              href="/app/buying"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Guided Buying
            </Link>
          </div>
        ) : null}
      </div>

      {data.canManageCatalog ? (
        <div className="mt-6 flex justify-end">
          <Link
            href="/app/marketplace/catalog/new"
            className="inline-flex items-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
          >
            Publish Offering
          </Link>
        </div>
      ) : null}

      {data.canManageCatalog && data.selfSupplier ? (
        <Link
          href="/app/marketplace/seller-profile"
          aria-label="Open Marketplace Seller Profile"
          className="group mt-8 block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition group-hover:border-blue-200">
                {data.selfSupplier.hasLogo ? (
                  <img
                    src={`/api/marketplace/supplier-logo/${data.selfSupplier.id}`}
                    alt={`${data.selfSupplier.tradingName ?? data.selfSupplier.legalName} logo`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Store className="h-7 w-7 text-slate-300 transition group-hover:text-blue-500" />
                )}
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Marketplace Seller Profile
                </p>
                <h2 className="mt-1 text-lg font-black transition group-hover:text-blue-700">
                  {data.selfSupplier.tradingName ??
                    data.selfSupplier.legalName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage business information, contact details, categories and logo.
                </p>
                <p className="mt-2 text-xs font-black text-blue-700">
                  Click anywhere on this profile card to edit
                </p>
              </div>
            </div>

            <span className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition group-hover:bg-blue-800">
              Open seller profile →
            </span>
          </div>
        </Link>
      ) : null}

      <form className={`${card} mt-8 grid gap-3 md:grid-cols-4`}>
        {params.vendor ? (
          <input
            type="hidden"
            name="vendor"
            value={params.vendor}
          />
        ) : null}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className={`${input} w-full pl-9`}
            name="q"
            defaultValue={params.q}
            placeholder="Search product, brand, model, SKU or supplier..."
          />
        </div>
        <input
          className={input}
          name="category"
          defaultValue={params.category}
          placeholder="Category"
        />
        <select
          className={input}
          name="type"
          defaultValue={params.type ?? ""}
        >
          <option value="">All offering types</option>
          <option value="PRODUCT">Products</option>
          <option value="SERVICE">Services</option>
        </select>
        <select
          className={input}
          name="availability"
          defaultValue={params.availability ?? ""}
        >
          <option value="">Any availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="LIMITED">Limited</option>
          <option value="BACKORDER">Backorder</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
        <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white md:col-span-4">
          Search catalog
        </button>
      </form>

      {data.commercialPersona === "SUPPLIER" ? (
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.results.map((result) => {
            const {
              offering,
              supplier,
              media,
            } = result;
            const primaryImage =
              media.find(
                (item) =>
                  item.isPrimary,
              ) ?? media[0];

            return (
              <article
                key={offering.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  {primaryImage ? (
                    <img
                      src={`/api/marketplace/catalog/media/${primaryImage.id}`}
                      alt={
                        primaryImage.altText ??
                        offering.name
                      }
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <PackageSearch className="h-14 w-14" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    {offering.offeringType ===
                    "SERVICE" ? (
                      <Boxes className="h-6 w-6 text-blue-700" />
                    ) : (
                      <PackageSearch className="h-6 w-6 text-blue-700" />
                    )}

                    {offering.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                        <Star className="h-3.5 w-3.5" />
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    {offering.name}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {offering.sku ??
                      "No SKU"}{" "}
                    ·{" "}
                    {supplier.tradingName ??
                      supplier.legalName}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {offering.shortDescription ??
                      offering.description ??
                      "No description available."}
                  </p>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        Unit price
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {offering.unitPrice
                          ? `${offering.currencyCode} ${Number(
                              offering.unitPrice,
                            ).toLocaleString()}`
                          : "Request quote"}
                      </p>
                    </div>
                    <BadgeDollarSign className="h-5 w-5 text-blue-700" />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : params.vendor ? (
        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Vendor offerings
              </p>
              <div className="mt-2 flex items-center gap-3">
                {data.selectedVendor?.hasLogo ? (
                  <img
                    src={`/api/marketplace/supplier-logo/${data.selectedVendor.supplierId}`}
                    alt={`${data.selectedVendor.supplierName} logo`}
                    className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                  />
                ) : null}
                <h2 className="text-2xl font-black">
                  {data.selectedVendor?.supplierName ??
                    "Marketplace vendor"}
                </h2>
              </div>
            </div>
            <Link
              href="/app/marketplace/catalog"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
            >
              ← All vendors
            </Link>
          </div>
          <MarketplaceComparisonResults
            groups={data.comparisonGroups}
          />
        </section>
      ) : (
        <>
          <section className="mt-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Marketplace suppliers
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Browse trusted suppliers
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Start with suppliers currently publishing products and
                  services in the Enorsis marketplace.
                </p>
              </div>

              {data.vendorDirectory.length > 5 ? (
                <Link
                  href="/app/marketplace/suppliers"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  View more suppliers
                </Link>
              ) : null}
            </div>

            <MarketplaceVendorDirectory
              vendors={data.vendorDirectory.slice(0, 5)}
            />

            {data.vendorDirectory.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                No marketplace suppliers are currently publishing
                offerings.
              </div>
            ) : null}
          </section>

          <section className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Published marketplace offerings
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Products & services available to buy
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Browse all supplier offerings currently published to the
                  buyer marketplace. Use search and filters above to narrow
                  by product, service, category, availability or supplier.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {data.comparisonGroups.length} offering group
                {data.comparisonGroups.length === 1 ? "" : "s"}
              </span>
            </div>

            {data.comparisonGroups.length > 0 ? (
              <MarketplaceComparisonResults
                groups={data.comparisonGroups}
              />
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                No published marketplace offerings match the current
                search and filter criteria.
              </div>
            )}
          </section>
        </>
      )}

      {data.canManageCatalog ? (
        <>
      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Manage supplier listings
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.managementResults.map((result) => {

            return (
              <form
                key={result.offering.id}
                action={updateMarketplaceOfferingStatusAction}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <input
                  type="hidden"
                  name="offeringId"
                  value={result.offering.id}
                />
                <p className="font-black">
                  {result.offering.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {result.supplier.tradingName ??
                    result.supplier.legalName}
                </p>
                {result.media.length ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {result.media.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-2">
                        <img src={`/api/marketplace/catalog/media/${item.id}`} alt={item.altText ?? result.offering.name} className="aspect-square w-full rounded-lg object-contain" />
                        <div className="mt-2 flex flex-col gap-1">
                          {!item.isPrimary ? (
                            <button
                              formAction={setMarketplaceOfferingPrimaryImageAction.bind(
                                null,
                                item.id,
                              )}
                              className="text-[10px] font-black text-blue-700"
                            >
                              Make primary
                            </button>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700">
                              Primary
                            </span>
                          )}
                          <button
                            formAction={deleteMarketplaceOfferingImageAction.bind(
                              null,
                              item.id,
                            )}
                            className="text-[10px] font-black text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <MarketplaceDirectImageUpload
                  offeringId={result.offering.id}
                  offeringName={result.offering.name}
                  existingCount={result.media.length}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
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
                    name="featured"
                    defaultValue={
                      result.offering.featured
                        ? "true"
                        : "false"
                    }
                  >
                    <option value="false">Standard</option>
                    <option value="true">Featured</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/app/marketplace/catalog/${result.offering.id}/edit`}
                    className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Edit offering
                  </Link>
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                    Update visibility
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
        </>
      ) : null}
    </div>
  );
}

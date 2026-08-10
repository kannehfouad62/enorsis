import Link from "next/link";
import {
  BadgeDollarSign,
  Boxes,
  PackageSearch,
  Search,
  Star,
} from "lucide-react";
import {
  addMarketplaceOfferingImagesAction,
  createMarketplaceOfferingAction,
  deleteMarketplaceOfferingImageAction,
  setMarketplaceOfferingPrimaryImageAction,
  updateMarketplaceOfferingStatusAction,
} from "@/modules/marketplace-catalog/actions";
import { MarketplaceComparisonResults } from "@/components/marketplace/MarketplaceComparisonResults";
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
        <div className="flex gap-2">
          <Link
            href="/app/marketplace/suppliers"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
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
      </div>

      <form className={`${card} mt-8 grid gap-3 md:grid-cols-4`}>
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
      ) : (
        <MarketplaceComparisonResults
          groups={
            data.comparisonGroups
          }
        />
      )}

      {data.canManageCatalog ? (
        <>
      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Publish supplier offering
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a marketplace product or service listing linked
          to an existing supplier.
        </p>

        <form
          action={createMarketplaceOfferingAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ??
                  supplier.legalName}{" "}
                · {supplier.supplierNumber}
              </option>
            ))}
          </select>
          <select
            className={input}
            name="offeringType"
            defaultValue="PRODUCT"
          >
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
          </select>
          <input className={input} name="sku" placeholder="SKU / service code" />
          <input className={input} name="name" placeholder="Offering name" required />
          <input className={input} name="shortDescription" placeholder="Short description" />
          <input className={input} name="category" placeholder="Category" />
          <input className={input} name="subcategory" placeholder="Subcategory" />
          <input className={input} name="manufacturer" placeholder="Manufacturer" />
          <input className={input} name="brand" placeholder="Brand" />
          <input className={input} name="modelNumber" placeholder="Model number" />
          <input className={input} name="unitOfMeasure" placeholder="Unit of measure" />
          <input className={input} name="currencyCode" defaultValue="USD" maxLength={3} />
          <input className={input} name="unitPrice" type="number" step="0.0001" min="0" placeholder="Unit price" />
          <input className={input} name="minimumOrderQty" type="number" step="0.0001" min="0" placeholder="Minimum order quantity" />
          <input className={input} name="leadTimeDays" type="number" min="0" placeholder="Lead time days" />
          <select className={input} name="availabilityStatus" defaultValue="AVAILABLE">
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="BACKORDER">Backorder</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
          <input className={input} name="countriesAvailable" placeholder="Countries available, comma separated" />
          <input className={input} name="certifications" placeholder="Certifications, comma separated" />
          <input className={input} name="keywords" placeholder="Search keywords, comma separated" />
          <label className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
            <span className="block text-sm font-black text-slate-800">Product / service images</span>
            <span className="mt-1 block text-xs text-slate-500">Upload up to 8 JPG, PNG or WebP images. The first image becomes the primary marketplace image.</span>
            <input className="mt-3 block w-full text-sm" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          </label>
          <input className={input} name="documentRef" placeholder="Document reference" />
          <input className={input} name="externalUrl" placeholder="External product/service URL" />
          <select className={input} name="marketplaceVisible" defaultValue="true">
            <option value="true">Marketplace visible</option>
            <option value="false">Hidden</option>
          </select>
          <select className={input} name="featured" defaultValue="false">
            <option value="false">Standard</option>
            <option value="true">Featured</option>
          </select>
          <textarea
            className={`${input} min-h-28 md:col-span-2`}
            name="description"
            placeholder="Full product or service description"
          />
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white md:col-span-2">
            Publish offering
          </button>
        </form>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Offering visibility controls
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
                          {!item.isPrimary ? <button formAction={setMarketplaceOfferingPrimaryImageAction} name="mediaId" value={item.id} className="text-[10px] font-black text-blue-700">Make primary</button> : <span className="text-[10px] font-black text-emerald-700">Primary</span>}
                          <button formAction={deleteMarketplaceOfferingImageAction} name="mediaId" value={item.id} className="text-[10px] font-black text-rose-700">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                  <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-xs" />
                  <button formAction={addMarketplaceOfferingImagesAction} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">Upload images</button>
                </div>
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
                <button className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                  Update listing
                </button>
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

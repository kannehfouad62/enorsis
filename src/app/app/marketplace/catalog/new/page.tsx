import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createMarketplaceOfferingAction } from "@/modules/marketplace-catalog/actions";
import { getMarketplaceCatalog } from "@/modules/marketplace-catalog/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950";

export default async function PublishMarketplaceOfferingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getMarketplaceCatalog({});

  if (!data.canManageCatalog || !data.selfSupplier) {
    redirect("/app/unauthorized");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Publish Offering
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Create a new product or service listing for the Enorsis
            global marketplace. Product images are added from the catalog
            management workspace after the offering is created.
          </p>
        </div>

        <Link
          href="/app/marketplace/catalog"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
              Marketplace seller
            </p>
            <p className="mt-1 font-black text-slate-950">
              {data.selfSupplier.tradingName ??
                data.selfSupplier.legalName}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Supplier identity · {data.selfSupplier.supplierNumber}
            </p>
          </div>
        </div>

        <form
          action={createMarketplaceOfferingAction}
          className="mt-6 grid gap-3 md:grid-cols-2"
        >
          <div
            className={`${input} flex items-center font-bold text-slate-700`}
          >
            Seller:{" "}
            {data.selfSupplier.tradingName ??
              data.selfSupplier.legalName}
          </div>

          <select
            className={input}
            name="offeringType"
            defaultValue="PRODUCT"
          >
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
          </select>

          <input
            className={input}
            name="sku"
            placeholder="SKU / service code"
          />

          <input
            className={input}
            name="name"
            placeholder="Offering name"
            required
          />

          <input
            className={input}
            name="shortDescription"
            placeholder="Short description"
          />

          <input
            className={input}
            name="category"
            placeholder="Category"
          />

          <input
            className={input}
            name="subcategory"
            placeholder="Subcategory"
          />

          <input
            className={input}
            name="manufacturer"
            placeholder="Manufacturer"
          />

          <input
            className={input}
            name="brand"
            placeholder="Brand"
          />

          <input
            className={input}
            name="modelNumber"
            placeholder="Model number"
          />

          <input
            className={input}
            name="unitOfMeasure"
            placeholder="Unit of measure"
          />

          <input
            className={input}
            name="currencyCode"
            defaultValue="USD"
            maxLength={3}
          />

          <input
            className={input}
            name="unitPrice"
            type="number"
            step="0.0001"
            min="0"
            placeholder="Unit price"
          />

          <input
            className={input}
            name="minimumOrderQty"
            type="number"
            step="0.0001"
            min="0"
            placeholder="Minimum order quantity"
          />

          <input
            className={input}
            name="leadTimeDays"
            type="number"
            min="0"
            placeholder="Lead time days"
          />

          <select
            className={input}
            name="availabilityStatus"
            defaultValue="AVAILABLE"
          >
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="BACKORDER">Backorder</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Available sizes
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Optional. For wearable products such as safety vests, gloves,
              footwear or uniforms, enter every size currently available.
              Separate sizes with commas.
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="availableSizes"
              placeholder="XS, S, M, L, XL, 2XL"
            />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Countries you sell / ship to
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Enter destination countries where buyers can purchase this offering.
              Separate multiple countries with commas.
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="countriesAvailable"
              placeholder="United States, Canada, United Kingdom"
            />
          </label>

          <input
            className={input}
            name="certifications"
            placeholder="Certifications, comma separated"
          />

          <input
            className={input}
            name="keywords"
            placeholder="Search keywords, comma separated"
          />

          <input
            className={input}
            name="documentRef"
            placeholder="Document reference"
          />

          <input
            className={input}
            name="externalUrl"
            placeholder="External product/service URL"
          />

          <select
            className={input}
            name="marketplaceVisible"
            defaultValue="true"
          >
            <option value="true">Marketplace visible</option>
            <option value="false">Save hidden</option>
          </select>

          <select
            className={input}
            name="featured"
            defaultValue="false"
          >
            <option value="false">Standard</option>
            <option value="true">Featured</option>
          </select>

          <textarea
            className={`${input} min-h-32 md:col-span-2`}
            name="description"
            placeholder="Full product or service description"
          />

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700 md:col-span-2">
            <p className="font-black text-slate-950">
              Product gallery
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              After publishing, Enorsis returns you to the catalog where
              you can upload up to eight JPG, PNG or WebP images directly
              to the listing gallery.
            </p>
          </div>

          <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white md:col-span-2">
            Publish offering
          </button>
        </form>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, PencilLine } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  updateMarketplaceOfferingDetailsAction,
} from "@/modules/marketplace-catalog/actions";
import {
  getMarketplaceOfferingForEdit,
} from "@/modules/marketplace-catalog/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950";

export default async function EditMarketplaceOfferingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const offering = await getMarketplaceOfferingForEdit(id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier Marketplace
          </p>
          <div className="mt-3 flex items-center gap-3">
            <PencilLine className="h-8 w-8 text-blue-700" />
            <h1 className="text-4xl font-black tracking-tight">
              Edit Offering
            </h1>
          </div>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Update marketplace information for this published product or
            service. Product images remain managed from the catalog workspace.
          </p>
        </div>

        <Link
          href="/app/marketplace/catalog"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <form
          action={updateMarketplaceOfferingDetailsAction}
          className="grid gap-3 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="offeringId"
            value={offering.id}
          />

          <select
            className={input}
            name="offeringType"
            defaultValue={offering.offeringType}
          >
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
          </select>

          <input
            className={input}
            name="sku"
            defaultValue={offering.sku ?? ""}
            placeholder="SKU / service code"
          />

          <input
            className={input}
            name="name"
            defaultValue={offering.name}
            required
            placeholder="Offering name"
          />

          <input
            className={input}
            name="shortDescription"
            defaultValue={offering.shortDescription ?? ""}
            placeholder="Short description"
          />

          <input
            className={input}
            name="category"
            defaultValue={offering.category ?? ""}
            placeholder="Category"
          />

          <input
            className={input}
            name="subcategory"
            defaultValue={offering.subcategory ?? ""}
            placeholder="Subcategory"
          />

          <input
            className={input}
            name="manufacturer"
            defaultValue={offering.manufacturer ?? ""}
            placeholder="Manufacturer"
          />

          <input
            className={input}
            name="brand"
            defaultValue={offering.brand ?? ""}
            placeholder="Brand"
          />

          <input
            className={input}
            name="modelNumber"
            defaultValue={offering.modelNumber ?? ""}
            placeholder="Model number"
          />

          <input
            className={input}
            name="unitOfMeasure"
            defaultValue={offering.unitOfMeasure ?? ""}
            placeholder="Unit of measure"
          />

          <input
            className={input}
            name="currencyCode"
            defaultValue={offering.currencyCode}
            maxLength={3}
          />

          <input
            className={input}
            name="unitPrice"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={
              offering.unitPrice == null
                ? ""
                : String(offering.unitPrice)
            }
            placeholder="Unit price"
          />

          <input
            className={input}
            name="minimumOrderQty"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={
              offering.minimumOrderQty == null
                ? ""
                : String(offering.minimumOrderQty)
            }
            placeholder="Minimum order quantity"
          />

          <input
            className={input}
            name="leadTimeDays"
            type="number"
            min="0"
            defaultValue={
              offering.leadTimeDays == null
                ? ""
                : String(offering.leadTimeDays)
            }
            placeholder="Lead time days"
          />

          <select
            className={input}
            name="availabilityStatus"
            defaultValue={offering.availabilityStatus}
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
              Optional. Separate available wearable sizes with commas.
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="availableSizes"
              defaultValue={offering.availableSizes.join(", ")}
              placeholder="XS, S, M, L, XL, 2XL"
            />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Countries you sell / ship to
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="countriesAvailable"
              defaultValue={offering.countriesAvailable.join(", ")}
              placeholder="United States, Canada, United Kingdom"
            />
          </label>

          <input
            className={input}
            name="certifications"
            defaultValue={offering.certifications.join(", ")}
            placeholder="Certifications, comma separated"
          />

          <input
            className={input}
            name="keywords"
            defaultValue={offering.keywords.join(", ")}
            placeholder="Search keywords, comma separated"
          />

          <input
            className={input}
            name="documentRef"
            defaultValue={offering.documentRef ?? ""}
            placeholder="Document reference"
          />

          <input
            className={input}
            name="externalUrl"
            defaultValue={offering.externalUrl ?? ""}
            placeholder="External product/service URL"
          />

          <select
            className={input}
            name="marketplaceVisible"
            defaultValue={
              offering.marketplaceVisible ? "true" : "false"
            }
          >
            <option value="true">Marketplace visible</option>
            <option value="false">Hidden</option>
          </select>

          <select
            className={input}
            name="featured"
            defaultValue={offering.featured ? "true" : "false"}
          >
            <option value="false">Standard</option>
            <option value="true">Featured</option>
          </select>

          <textarea
            className={`${input} min-h-36 md:col-span-2`}
            name="description"
            defaultValue={offering.description ?? ""}
            placeholder="Full product or service description"
          />

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700 md:col-span-2">
            Existing product photos are preserved. Return to Marketplace Catalog
            after saving to upload, remove, or change the primary image.
          </div>

          <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white md:col-span-2">
            Save offering changes
          </button>
        </form>
      </section>
    </div>
  );
}

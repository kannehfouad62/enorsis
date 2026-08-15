import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe2,
  Mail,
  BadgeCheck,
  MapPin,
  Phone,
  Store,
} from "lucide-react";

import { SupplierMarketplaceLogoUpload } from "@/components/marketplace/SupplierMarketplaceLogoUpload";
import { updateMarketplaceSellerProfileAction } from "@/modules/marketplace-seller-profile/actions";
import { getMarketplaceSellerProfile } from "@/modules/marketplace-seller-profile/queries";

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950";

export default async function MarketplaceSellerProfilePage() {
  const data =
    await getMarketplaceSellerProfile();

  const supplier = data.supplier;
  const location = data.location;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Marketplace Seller Profile
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Business Profile
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Manage how your business identity appears to buyers
            across the Enorsis marketplace.
          </p>
        </div>

        <Link
          href="/app/marketplace/catalog"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <SupplierMarketplaceLogoUpload
            supplierId={supplier.id}
            supplierName={
              supplier.tradingName ??
              supplier.legalName
            }
            hasLogo={Boolean(
              supplier.marketplaceLogoPathname,
            )}
          />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Governed legal identity
            </p>
            <h2 className="mt-2 text-lg font-black">
              {supplier.legalName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Supplier {supplier.supplierNumber}
            </p>

            <div className="mt-5 space-y-3 text-sm text-slate-700">
              <div className="flex gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  Legal company information is synchronized
                  from the tenant organization record.
                </span>
              </div>
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {location
                    ? [
                        location.city,
                        location.region,
                        location.countryCode,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : supplier.countryCode}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-blue-700" />
            <div>
              <h2 className="text-xl font-black">
                Marketplace-facing business information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Buyers will use this information when evaluating
                your company and offerings.
              </p>
            </div>
          </div>

          <form
            action={updateMarketplaceSellerProfileAction}
            className="mt-6 grid gap-5"
          >
            <input
              type="hidden"
              name="supplierId"
              value={supplier.id}
            />

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Trading / marketplace name
              </span>
              <input
                className={`${input} mt-1`}
                name="tradingName"
                defaultValue={
                  supplier.tradingName ??
                  supplier.legalName
                }
                required
              />
            </label>

            <label>
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <BadgeCheck className="h-3.5 w-3.5" />
                Tax identification number
              </span>
              <input
                className={`${input} mt-1`}
                name="taxIdentificationNo"
                defaultValue={supplier.taxIdentificationNo ?? ""}
                placeholder="EIN, VAT, TIN or local tax identifier"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Enter the official tax identifier used by your legal entity.
              </span>
            </label>

            <label>
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <Globe2 className="h-3.5 w-3.5" />
                Website
              </span>
              <input
                className={`${input} mt-1`}
                name="website"
                type="url"
                defaultValue={supplier.website ?? ""}
                placeholder="https://www.example.com"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  Business email
                </span>
                <input
                  className={`${input} mt-1`}
                  name="primaryEmail"
                  type="email"
                  defaultValue={
                    supplier.primaryEmail ?? ""
                  }
                  placeholder="sales@example.com"
                />
              </label>

              <label>
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <Phone className="h-3.5 w-3.5" />
                  Business phone
                </span>
                <input
                  className={`${input} mt-1`}
                  name="primaryPhone"
                  defaultValue={
                    supplier.primaryPhone ?? ""
                  }
                  placeholder="+1 ..."
                />
              </label>
            </div>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Business categories
              </span>
              <input
                className={`${input} mt-1`}
                name="categories"
                defaultValue={
                  supplier.categories.join(", ")
                }
                placeholder="Industrial Safety, PPE, Logistics"
              />
              <span className="mt-1 block text-xs text-slate-500">
                High-level marketplace categories. Separate multiple categories with commas.
              </span>
            </label>

            <div id="capabilities" className="scroll-mt-28 border-t border-slate-200 pt-6">
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
                Products, Services & Capabilities
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-950">
                Supplier capability profile
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Describe what your company sells, the services it provides, and
                the operational or technical capabilities buyers can evaluate.
                Enter one item per line.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Products
                </span>
                <textarea
                  className={`${input} mt-1 min-h-44`}
                  name="products"
                  defaultValue={supplier.products.join("\n")}
                  placeholder={"Safety helmets\nIndustrial gloves\nElectrical components"}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Physical or digital products supplied by your company.
                </span>
              </label>

              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Services
                </span>
                <textarea
                  className={`${input} mt-1 min-h-44`}
                  name="services"
                  defaultValue={supplier.services.join("\n")}
                  placeholder={"Equipment maintenance\nLogistics support\nTechnical consulting"}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Professional, operational, or managed services you provide.
                </span>
              </label>

              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Capabilities
                </span>
                <textarea
                  className={`${input} mt-1 min-h-44`}
                  name="capabilities"
                  defaultValue={supplier.capabilities.join("\n")}
                  placeholder={"24-hour fulfillment\nCustom fabrication\nNationwide distribution"}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Distinct competencies, capacity, technology, or delivery strengths.
                </span>
              </label>
            </div>

            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Save company & capability profile
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

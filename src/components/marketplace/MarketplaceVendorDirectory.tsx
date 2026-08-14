import Link from "next/link";
import { Building2, MapPin, PackageSearch, Truck } from "lucide-react";

export type MarketplaceVendorDirectoryItem = {
  supplierId: string;
  supplierName: string;
  supplierNumber: string;
  offeringCount: number;
  productCount: number;
  serviceCount: number;
  categories: string[];
  countries: string[];
  location: {
    city: string | null;
    region: string | null;
    countryCode: string | null;
    siteName: string | null;
  };
};

export function MarketplaceVendorDirectory({
  vendors,
}: {
  vendors: MarketplaceVendorDirectoryItem[];
}) {
  if (vendors.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-black">No marketplace vendors matched your search.</p>
      </div>
    );
  }

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {vendors.map((vendor) => (
        <Link
          key={vendor.supplierId}
          href={`/app/marketplace/catalog?vendor=${encodeURIComponent(vendor.supplierId)}`}
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {vendor.offeringCount} offering{vendor.offeringCount === 1 ? "" : "s"}
            </span>
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-950 group-hover:text-blue-700">
            {vendor.supplierName}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{vendor.supplierNumber}</p>

          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {[vendor.location.city, vendor.location.region, vendor.location.countryCode]
                  .filter(Boolean)
                  .join(", ") || "Location not specified"}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {vendor.countries.length
                  ? `Ships/sells to ${vendor.countries.join(", ")}`
                  : "Shipping coverage not specified"}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {vendor.categories.slice(0, 4).map((category) => (
              <span
                key={category}
                className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
              >
                {category}
              </span>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-black text-blue-700">
            View vendor offerings →
          </div>
        </Link>
      ))}
    </section>
  );
}

#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

// ---------------------------------------------------------
// 1. Marketplace query: resolve seller tenant location
// ---------------------------------------------------------
patch("src/modules/marketplace-catalog/queries.ts", (source) => {
  const mediaAnchor = `  const media = offerings.length
    ? await prisma.supplierMarketplaceOfferingMedia.findMany({`;

  if (
    source.includes(mediaAnchor) &&
    !source.includes("marketplaceSellerTenants")
  ) {
    const sellerTenantQuery = `  const marketplaceSellerTenants = offerings.length
    ? await prisma.tenant.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                offerings.map(
                  (offering) => offering.tenantId,
                ),
              ),
            ],
          },
        },
        select: {
          id: true,
          countryCode: true,
          sites: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              name: true,
              city: true,
              region: true,
              countryCode: true,
            },
          },
        },
      })
    : [];

  const sellerTenantMap = new Map(
    marketplaceSellerTenants.map((tenant) => [
      tenant.id,
      tenant,
    ]),
  );

`;

    source = source.replace(
      mediaAnchor,
      sellerTenantQuery + mediaAnchor,
    );
  }

  const resultAnchor = `      return {
        offering,
        supplier,
        keywords,
        countries,
        certifications,
        media:
          mediaByOffering.get(
            offering.id,
          ) ?? [],
      };`;

  const resultReplacement = `      const sellerTenant = sellerTenantMap.get(
        offering.tenantId,
      );
      const sellerSite = sellerTenant?.sites[0];

      return {
        offering,
        supplier,
        keywords,
        countries,
        certifications,
        sellerLocation: {
          city: sellerSite?.city ?? null,
          region: sellerSite?.region ?? null,
          countryCode:
            sellerSite?.countryCode ??
            sellerTenant?.countryCode ??
            null,
          siteName: sellerSite?.name ?? null,
        },
        media:
          mediaByOffering.get(
            offering.id,
          ) ?? [],
      };`;

  if (
    source.includes(resultAnchor) &&
    !source.includes("sellerLocation:")
  ) {
    source = source.replace(
      resultAnchor,
      resultReplacement,
    );
  }

  return source;
});

// ---------------------------------------------------------
// 2. Publish Offering: make shipping coverage explicit
// ---------------------------------------------------------
patch("src/app/app/marketplace/catalog/new/page.tsx", (source) => {
  const oldField = `          <input
            className={input}
            name="countriesAvailable"
            placeholder="Countries available, comma separated"
          />`;

  const newField = `          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
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
          </label>`;

  if (source.includes(oldField)) {
    source = source.replace(oldField, newField);
  }

  return source;
});

// ---------------------------------------------------------
// 3. Buyer catalog: show seller location and destination coverage
// ---------------------------------------------------------
patch(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
  (source) => {
    if (!source.includes("MapPin")) {
      source = source.replace(
        `  PackageSearch,
  Store,`,
        `  PackageSearch,
  Store,
  MapPin,
  Truck,`,
      );
    }

    const metricsAnchor = `                <div className="mt-5 grid gap-3 sm:grid-cols-3">`;

    const locationBlock = `                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs font-black uppercase">
                        Seller location
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-800">
                      {[
                        representative.sellerLocation.city,
                        representative.sellerLocation.region,
                        representative.sellerLocation.countryCode,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Location not specified"}
                    </p>
                    {representative.sellerLocation.siteName ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {representative.sellerLocation.siteName}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck className="h-4 w-4" />
                      <span className="text-xs font-black uppercase">
                        Sells / ships to
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-800">
                      {representative.countries.length > 0
                        ? representative.countries.join(", ")
                        : "Shipping coverage not specified"}
                    </p>
                  </div>
                </div>

`;

    if (
      source.includes(metricsAnchor) &&
      !source.includes("Seller location")
    ) {
      source = source.replace(
        metricsAnchor,
        locationBlock + metricsAnchor,
      );
    }

    return source;
  },
);

console.log(
  "B13.10.9 marketplace seller location and shipping coverage integration complete.",
);

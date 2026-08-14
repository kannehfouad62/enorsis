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

// Marketplace catalog query: surface logo state on seller identity and vendor directory.
patch("src/modules/marketplace-catalog/queries.ts", (source) => {
  source = source.replace(
    `          tradingName: true,
        },`,
    `          tradingName: true,
          marketplaceLogoPathname: true,
        },`,
  );

  source = source.replace(
    `      location: (typeof results)[number]["sellerLocation"];
    }`,
    `      location: (typeof results)[number]["sellerLocation"];
      hasLogo: boolean;
    }`,
  );

  source = source.replace(
    `        location: result.sellerLocation,
      };`,
    `        location: result.sellerLocation,
        hasLogo: Boolean(
          result.supplier.marketplaceLogoPathname,
        ),
      };`,
  );

  source = source.replace(
    `            tradingName: selfSupplier.tradingName,
          }`,
    `            tradingName: selfSupplier.tradingName,
            hasLogo: Boolean(
              selfSupplier.marketplaceLogoPathname,
            ),
          }`,
  );

  return source;
});

// Vendor directory: render the supplier logo when configured.
patch(
  "src/components/marketplace/MarketplaceVendorDirectory.tsx",
  (source) => {
    source = source.replace(
      `  location: {
    city: string | null;`,
      `  hasLogo: boolean;
  location: {
    city: string | null;`,
    );

    const icon = `            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Building2 className="h-6 w-6" />
            </div>`;

    const logo = `            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-blue-700 shadow-sm">
              {vendor.hasLogo ? (
                <img
                  src={\`/api/marketplace/supplier-logo/\${vendor.supplierId}\`}
                  alt={\`\${vendor.supplierName} logo\`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-7 w-7" />
              )}
            </div>`;

    if (source.includes(icon)) {
      source = source.replace(icon, logo);
    }

    return source;
  },
);

// Seller catalog: add one company-level business-logo manager.
patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  if (
    !source.includes(
      "@/components/marketplace/SupplierMarketplaceLogoUpload",
    )
  ) {
    source = source.replace(
      `import { MarketplaceVendorDirectory } from "@/components/marketplace/MarketplaceVendorDirectory";`,
      `import { MarketplaceVendorDirectory } from "@/components/marketplace/MarketplaceVendorDirectory";
import { SupplierMarketplaceLogoUpload } from "@/components/marketplace/SupplierMarketplaceLogoUpload";`,
    );
  }

  const searchForm = `      <form className={\`\${card} mt-8 grid gap-3 md:grid-cols-4\`}>`;

  if (
    source.includes(searchForm) &&
    !source.includes("<SupplierMarketplaceLogoUpload")
  ) {
    source = source.replace(
      searchForm,
      `      {data.canManageCatalog && data.selfSupplier ? (
        <div className="mt-8">
          <SupplierMarketplaceLogoUpload
            supplierId={data.selfSupplier.id}
            supplierName={
              data.selfSupplier.tradingName ??
              data.selfSupplier.legalName
            }
            hasLogo={data.selfSupplier.hasLogo}
          />
        </div>
      ) : null}

${searchForm}`,
    );
  }

  // Selected vendor heading also gets the logo.
  const vendorHeading = `              <h2 className="mt-1 text-2xl font-black">
                {data.selectedVendor?.supplierName ??
                  "Marketplace vendor"}
              </h2>`;

  const vendorHeadingWithLogo = `              <div className="mt-2 flex items-center gap-3">
                {data.selectedVendor?.hasLogo ? (
                  <img
                    src={\`/api/marketplace/supplier-logo/\${data.selectedVendor.supplierId}\`}
                    alt={\`\${data.selectedVendor.supplierName} logo\`}
                    className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                  />
                ) : null}
                <h2 className="text-2xl font-black">
                  {data.selectedVendor?.supplierName ??
                    "Marketplace vendor"}
                </h2>
              </div>`;

  if (source.includes(vendorHeading)) {
    source = source.replace(
      vendorHeading,
      vendorHeadingWithLogo,
    );
  }

  return source;
});

console.log(
  "B13.10.15 supplier business logo marketplace integration complete.",
);

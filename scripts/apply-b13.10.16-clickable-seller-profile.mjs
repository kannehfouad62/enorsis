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

// Preserve seller-managed marketplace trading name.
// Legal name and country remain governed by Tenant.
patch("src/core/marketplace/tenant-self-supplier.ts", (source) => {
  source = source.replace(
    `      existing.tradingName !== tenant.name ||
      existing.countryCode !== countryCode`,
    `      existing.countryCode !== countryCode`,
  );

  source = source.replace(
    `          tradingName: tenant.name,
          countryCode,`,
    `          countryCode,`,
  );

  return source;
});

// Catalog profile area becomes a real navigation entry.
patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  const old = `      {data.canManageCatalog && data.selfSupplier ? (
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
      ) : null}`;

  const updated = `      {data.canManageCatalog && data.selfSupplier ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {data.selfSupplier.hasLogo ? (
                  <img
                    src={\`/api/marketplace/supplier-logo/\${data.selfSupplier.id}\`}
                    alt={\`\${data.selfSupplier.tradingName ?? data.selfSupplier.legalName} logo\`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Store className="h-7 w-7 text-slate-300" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Marketplace Seller Profile
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {data.selfSupplier.tradingName ??
                    data.selfSupplier.legalName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage business information, contact details, categories and logo.
                </p>
              </div>
            </div>

            <Link
              href="/app/marketplace/seller-profile"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
            >
              Edit seller profile →
            </Link>
          </div>
        </section>
      ) : null}`;

  if (source.includes(old)) {
    source = source.replace(old, updated);
  }

  if (
    source.includes("<SupplierMarketplaceLogoUpload") &&
    !source.includes('href="/app/marketplace/seller-profile"')
  ) {
    throw new Error(
      "Existing seller profile block did not match the expected B13.10.15 layout.",
    );
  }

  // Remove now-unused direct logo component import from catalog.
  source = source.replace(
    `import { SupplierMarketplaceLogoUpload } from "@/components/marketplace/SupplierMarketplaceLogoUpload";\n`,
    "",
  );

  // Ensure Store icon is available in the existing lucide import.
  if (
    !source.match(
      /import\s*{[\s\S]*?\bStore\b[\s\S]*?}\s*from\s*"lucide-react"/,
    )
  ) {
    source = source.replace(
      `  Star,
} from "lucide-react";`,
      `  Star,
  Store,
} from "lucide-react";`,
    );
  }

  return source;
});

console.log(
  "B13.10.16 clickable seller business profile integration complete.",
);

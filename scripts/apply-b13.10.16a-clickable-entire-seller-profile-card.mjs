#!/usr/bin/env node
import fs from "node:fs";

const path = "src/app/app/marketplace/catalog/page.tsx";
let source = fs.readFileSync(path, "utf8");

const old = `      {data.canManageCatalog && data.selfSupplier ? (
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

const updated = `      {data.canManageCatalog && data.selfSupplier ? (
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
                    src={\`/api/marketplace/supplier-logo/\${data.selfSupplier.id}\`}
                    alt={\`\${data.selfSupplier.tradingName ?? data.selfSupplier.legalName} logo\`}
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
      ) : null}`;

if (!source.includes(old)) {
  throw new Error(
    "Current Marketplace Seller Profile card did not match the expected B13.10.16 structure.",
  );
}

source = source.replace(old, updated);
fs.writeFileSync(path, source);

console.log(
  "B13.10.16a entire seller profile card is now clickable.",
);

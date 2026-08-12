#!/usr/bin/env node
import fs from "node:fs";

const path =
  "src/components/marketplace/MarketplaceComparisonResults.tsx";

let source = fs.readFileSync(path, "utf8");

if (
  !source.includes(
    "@/components/marketplace/MarketplaceProductGallery",
  )
) {
  source = source.replace(
    `import { MarketplaceAddToCartButton } from "@/components/marketplace/MarketplaceAddToCartButton";`,
    `import { MarketplaceAddToCartButton } from "@/components/marketplace/MarketplaceAddToCartButton";
import { MarketplaceProductGallery } from "@/components/marketplace/MarketplaceProductGallery";`,
  );
}

const oldGallery = `        const primaryImage =
          representative.media.find(
            (item) => item.isPrimary,
          ) ?? representative.media[0];

        return (
          <article
            key={group.key}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <div className="bg-slate-50 p-5">
                <div className="aspect-square rounded-2xl bg-white">
                  {primaryImage ? (
                    <img
                      src={\`/api/marketplace/catalog/media/\${primaryImage.id}\`}
                      alt={
                        primaryImage.altText ??
                        representative.offering
                          .name
                      }
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <PackageSearch className="h-14 w-14" />
                    </div>
                  )}
                </div>
              </div>`;

const newGallery = `        return (
          <article
            key={group.key}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
              <div className="bg-slate-50 p-5">
                <MarketplaceProductGallery
                  media={representative.media.map((item) => ({
                    id: item.id,
                    altText: item.altText,
                    isPrimary: item.isPrimary,
                    position: item.position,
                  }))}
                  offeringName={representative.offering.name}
                />
              </div>`;

if (source.includes(oldGallery)) {
  source = source.replace(oldGallery, newGallery);
} else if (!source.includes("<MarketplaceProductGallery")) {
  throw new Error(
    "Could not locate the current marketplace image block.",
  );
}

const descriptionMarker = `                    {representative.offering
                      .modelNumber ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Model{" "}
                        {
                          representative
                            .offering
                            .modelNumber
                        }
                      </p>
                    ) : null}
                  </div>`;

const descriptionReplacement = `                    {representative.offering
                      .modelNumber ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Model{" "}
                        {
                          representative
                            .offering
                            .modelNumber
                        }
                      </p>
                    ) : null}

                    {representative.offering
                      .shortDescription ? (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {
                          representative
                            .offering
                            .shortDescription
                        }
                      </p>
                    ) : null}

                    {representative.offering
                      .description ? (
                      <details className="mt-3 max-w-3xl">
                        <summary className="cursor-pointer text-sm font-black text-blue-700 hover:text-blue-800">
                          View full description
                        </summary>
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {
                              representative
                                .offering
                                .description
                            }
                          </p>
                        </div>
                      </details>
                    ) : null}
                  </div>`;

if (
  source.includes(descriptionMarker) &&
  !source.includes("View full description")
) {
  source = source.replace(
    descriptionMarker,
    descriptionReplacement,
  );
}

fs.writeFileSync(path, source);

console.log(
  "B13.10.7 marketplace product descriptions and photo gallery integration complete.",
);

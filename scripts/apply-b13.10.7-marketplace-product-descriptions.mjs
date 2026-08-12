#!/usr/bin/env node
import fs from "node:fs";

const path =
  "src/components/marketplace/MarketplaceComparisonResults.tsx";

let source = fs.readFileSync(path, "utf8");

const marker = `                    {representative.offering
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

const replacement = `                    {representative.offering
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

if (source.includes(marker)) {
  source = source.replace(marker, replacement);
} else if (
  !source.includes("View full description")
) {
  throw new Error(
    "Could not locate marketplace product heading block.",
  );
}

fs.writeFileSync(path, source);

console.log(
  "B13.10.7 marketplace product description presentation complete.",
);

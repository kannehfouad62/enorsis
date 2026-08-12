#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const query = read(
  "src/modules/marketplace-catalog/queries.ts",
);
const publish = read(
  "src/app/app/marketplace/catalog/new/page.tsx",
);
const results = read(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
);

if (!query.includes("marketplaceSellerTenants")) {
  failures.push(
    "Marketplace query does not resolve seller tenant location.",
  );
}

if (!query.includes("sellerLocation:")) {
  failures.push(
    "Marketplace result does not expose sellerLocation.",
  );
}

if (
  !publish.includes(
    "Countries you sell / ship to",
  )
) {
  failures.push(
    "Publish Offering does not clearly request shipping/sales countries.",
  );
}

if (!results.includes("Seller location")) {
  failures.push(
    "Buyer catalog does not display seller location.",
  );
}

if (!results.includes("Sells / ships to")) {
  failures.push(
    "Buyer catalog does not display shipping coverage.",
  );
}

if (!results.includes("representative.countries")) {
  failures.push(
    "Buyer catalog is not using offering countriesAvailable data.",
  );
}

if (failures.length) {
  console.error("B13.10.9 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.9 marketplace seller location and shipping coverage validation passed.",
);

#!/usr/bin/env node
import fs from "node:fs";

const required = [
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
  "src/modules/marketplace-catalog/queries.ts",
  "src/app/app/marketplace/catalog/page.tsx",
];

const missing = required.filter(
  (file) => !fs.existsSync(file),
);

const query = fs.readFileSync(
  "src/modules/marketplace-catalog/queries.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);
const component = fs.existsSync(
  required[0],
)
  ? fs.readFileSync(required[0], "utf8")
  : "";

if (!query.includes("comparisonGroups")) {
  missing.push(
    "comparisonGroups query aggregation",
  );
}
if (!query.includes("searchTokens.every")) {
  missing.push(
    "multi-token global marketplace search",
  );
}
if (!query.includes("managementResults")) {
  missing.push(
    "persona-scoped management results",
  );
}
if (
  !component.includes(
    "Compare supplier offers",
  )
) {
  missing.push(
    "multi-supplier comparison presentation",
  );
}
if (!page.includes("data.canManageCatalog")) {
  missing.push(
    "buyer/supplier catalog management separation",
  );
}

if (missing.length) {
  console.error(
    "B13.10.4A validation failed:",
  );
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(
  "B13.10.4A global product search and multi-supplier comparison validation passed.",
);

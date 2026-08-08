#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/marketplace/trust"')) {
  console.log("Marketplace trust metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },';

const replacement =
  `${marker}\n  "/app/marketplace/trust": { id: "verified-supplier-network-ratings", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Marketplace Product Catalog registry metadata.",
  );
}

source = source.replace(marker, replacement);
fs.writeFileSync(file, source);
console.log("Registered Verified Supplier Network & Ratings metadata.");

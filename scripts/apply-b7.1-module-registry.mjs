#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/marketplace/suppliers"')) {
  console.log("Supplier Marketplace Discovery metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/suppliers": { id: "suppliers", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },';

const replacement =
  `${marker}\n  "/app/marketplace/suppliers": { id: "supplier-marketplace-discovery", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Supplier Management registry metadata.",
  );
}

source = source.replace(marker, replacement);
fs.writeFileSync(file, source);
console.log("Registered Supplier Marketplace Discovery metadata.");

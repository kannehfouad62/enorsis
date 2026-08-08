#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);
let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/supplier-portal/collaboration"')) {
  console.log("Supplier Collaboration access metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/supplier-portal": { id: "supplier-portal", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },';

const entry =
  `${marker}\n  "/app/supplier-portal/collaboration": { id: "supplier-collaboration-operations", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },`;

if (!source.includes(marker)) {
  throw new Error("Could not locate Supplier Portal access metadata.");
}

source = source.replace(marker, entry);
fs.writeFileSync(file, source);
console.log("Registered Supplier Collaboration access metadata.");

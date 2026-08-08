#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/supplier-portal/access"')) {
  console.log("Supplier Self-Service Access metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/supplier-portal/collaboration": { id: "supplier-collaboration-operations", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },';

const replacement =
  `${marker}\n  "/app/supplier-portal/access": { id: "supplier-self-service-access", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Supplier Collaboration access metadata.",
  );
}

source = source.replace(marker, replacement);
fs.writeFileSync(file, source);
console.log("Registered Supplier Self-Service Access metadata.");

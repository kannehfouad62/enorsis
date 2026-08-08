#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/marketplace/matching"')) {
  console.log("AI Supplier Matching metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/marketplace/trust": { id: "verified-supplier-network-ratings", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },';

const replacement =
  `${marker}\n  "/app/marketplace/matching": { id: "ai-supplier-matching", featureKey: FEATURE_KEYS.AI_PLATFORM, aiEligible: true },`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Verified Supplier Network registry metadata.",
  );
}

source = source.replace(marker, replacement);
fs.writeFileSync(file, source);
console.log("Registered AI Supplier Matching metadata.");

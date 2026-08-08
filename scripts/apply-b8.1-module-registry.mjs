#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('"/app/analytics/predictive-procurement"')) {
  console.log("Predictive Procurement metadata already present.");
  process.exit(0);
}

const marker =
  '  "/app/analytics/process-mining": {\n    id: "enterprise-process-mining",\n    featureKey: FEATURE_KEYS.AI_PLATFORM,\n    aiEligible: true,\n  },';

const replacement =
  `${marker}\n  "/app/analytics/predictive-procurement": {\n    id: "predictive-procurement-forecasting",\n    featureKey: FEATURE_KEYS.AI_PLATFORM,\n    aiEligible: true,\n  },`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Enterprise Process Mining registry metadata.",
  );
}

source = source.replace(marker, replacement);
fs.writeFileSync(file, source);
console.log("Registered Predictive Procurement Forecasting metadata.");

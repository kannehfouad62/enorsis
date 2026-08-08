#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (
  source.includes(
    '"/app/analytics/predictive-capacity"',
  )
) {
  console.log(
    "Predictive Capacity Planning metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/analytics/predictive-capacity": {
    id: "predictive-capacity-planning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/analytics/predictive-inventory": {
    id: "predictive-inventory-optimization",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/analytics/predictive-procurement": {
    id: "predictive-procurement-forecasting",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate predictive intelligence registry metadata.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);
console.log(
  "Registered Predictive Capacity Planning metadata.",
);

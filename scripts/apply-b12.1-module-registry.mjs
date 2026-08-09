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
    '"/app/analytics/outcome-learning"',
  )
) {
  console.log(
    "Closed-Loop Outcome Learning metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/analytics/outcome-learning": {
    id: "closed-loop-outcome-learning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/analytics/predictive-procurement": {`,
  `  "/app/analytics/digital-twin": {`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate Intelligence analytics registry metadata.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Closed-Loop Outcome Learning metadata.",
);

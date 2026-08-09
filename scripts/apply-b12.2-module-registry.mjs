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
    '"/app/analytics/outcome-learning/reconciliation"',
  )
) {
  console.log(
    "Native Outcome Reconciliation metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/analytics/outcome-learning/reconciliation": {
    id: "closed-loop-native-outcome-reconciliation",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const marker = `  "/app/analytics/outcome-learning": {
    id: "closed-loop-outcome-learning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Closed-Loop Outcome Learning registry metadata.",
  );
}

source = source.replace(
  marker,
  `${marker}${entry}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Native Outcome Reconciliation metadata.",
);

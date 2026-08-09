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
    '"/app/analytics/outcome-learning/policies"',
  )
) {
  console.log(
    "Learning Policy Activation & Versioning metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/analytics/outcome-learning/policies": {
    id: "closed-loop-learning-policy-versioning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/analytics/outcome-learning/proposals": {
    id: "closed-loop-learning-proposals",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/analytics/outcome-learning/calibration": {
    id: "closed-loop-prediction-calibration",
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
    "Could not locate closed-loop registry metadata anchor.",
  );
}

source = source.replace(
  marker,
  `${marker}${entry}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Learning Policy Activation & Versioning metadata.",
);

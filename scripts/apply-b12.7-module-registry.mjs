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
    '"/app/analytics/outcome-learning/runtime-traces"',
  )
) {
  console.log(
    "Runtime Policy Decision Traceability metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/analytics/outcome-learning/runtime-traces": {
    id: "closed-loop-runtime-policy-traces",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/analytics/outcome-learning/runtime-policy": {
    id: "closed-loop-runtime-policy-guardrails",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/analytics/outcome-learning/policies": {
    id: "closed-loop-learning-policy-versioning",
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
    "Could not locate B12 runtime-policy registry metadata anchor.",
  );
}

source = source.replace(
  marker,
  `${marker}${entry}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Runtime Policy Decision Traceability metadata.",
);

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
    '"/app/governance/autonomous-execution/adapters"',
  )
) {
  console.log(
    "Controlled Transaction Adapters metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/governance/autonomous-execution/adapters": {
    id: "controlled-transaction-adapters",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/governance/autonomous-execution": {
    id: "controlled-autonomous-execution",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/automation/autonomous-recommendations": {
    id: "autonomous-strategy-savings-risk",
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
    "Could not locate B9 registry metadata anchor.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Controlled Transaction Adapters metadata.",
);

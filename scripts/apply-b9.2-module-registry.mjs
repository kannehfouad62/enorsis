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
    '"/app/automation/autonomous-recommendations"',
  )
) {
  console.log(
    "Autonomous Strategy & Savings metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/automation/autonomous-recommendations": {
    id: "autonomous-strategy-savings-risk",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/automation/autonomous-planning": {
    id: "autonomous-procurement-planning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/analytics/digital-twin": {
    id: "procurement-digital-twin",
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
    "Could not locate B9.1 or Digital Twin registry metadata.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Autonomous Strategy & Savings metadata.",
);

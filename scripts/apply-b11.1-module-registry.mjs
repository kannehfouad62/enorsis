#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

if (
  source.includes('"/app/automation/orchestrator"')
) {
  console.log(
    "Autonomous Procurement Orchestrator metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/automation/orchestrator": {
    id: "autonomous-procurement-orchestrator",
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
    "Could not locate autonomous automation registry metadata.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Autonomous Procurement Orchestrator metadata.",
);

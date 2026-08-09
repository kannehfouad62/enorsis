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
    '"/app/governance/autonomous-execution/native-drafts/sourcing"',
  )
) {
  console.log(
    "Native Strategic Sourcing Adapter metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/governance/autonomous-execution/native-drafts/sourcing": {
    id: "native-strategic-sourcing-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/governance/autonomous-execution/native-drafts/purchase-requests": {
    id: "native-purchase-request-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/governance/autonomous-execution/native-drafts": {
    id: "governed-native-workflow-drafts",
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
    "Could not locate B10 native adapter registry metadata.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Strategic Sourcing Adapter metadata.",
);

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/cross-engine-governance";

if (source.includes(`"${href}"`)) {
  console.log(
    "Cross-Engine Intelligence Governance metadata already present.",
  );
  process.exit(0);
}

const entry = `  "${href}": {
    id: "cross-engine-intelligence-governance",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
`;

const anchors = [
  `  "/app/settings/platform-readiness/ai-engine-adoption": {`,
  `  "/app/settings/platform-readiness/ai-runtime-health": {`,
  `  "/app/settings/platform-readiness/ai-runtime-certification": {`,
  `  "/app/settings/licensing": {`,
];

const anchor = anchors.find((candidate) =>
  source.includes(candidate),
);

if (!anchor) {
  throw new Error(
    "Could not locate stable B13 registry metadata anchor.",
  );
}

source = source.replace(
  anchor,
  `${entry}${anchor}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Cross-Engine Intelligence Governance metadata.",
);

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source =
  fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/end-to-end-commerce";

if (source.includes(`"${href}"`)) {
  console.log(
    "End-to-End Commerce Certification metadata already present.",
  );
  process.exit(0);
}

const entry = `  "${href}": {
    id: "end-to-end-commerce-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
`;

const anchors = [
  `  "/app/settings/platform-readiness/final-release-certification": {`,
  `  "/app/settings/platform-readiness/security-certification": {`,
  `  "/app/settings/platform-readiness/performance-certification": {`,
  `  "/app/settings/licensing": {`,
];

const anchor =
  anchors.find((candidate) =>
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
  "Registered End-to-End Commerce Certification metadata.",
);

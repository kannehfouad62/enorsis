#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/ai-runtime-certification";

if (source.includes(`"${href}"`)) {
  console.log(
    "Governed AI Runtime Certification metadata already present.",
  );
  process.exit(0);
}

const entry = `  "${href}": {
    id: "governed-ai-runtime-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
`;

const anchor = `  "/app/settings/licensing": {
    id: "licensing-entitlements",
`;

if (!source.includes(anchor)) {
  throw new Error(
    "Could not locate stable licensing metadata anchor in registry.ts.",
  );
}

source = source.replace(
  anchor,
  `${entry}${anchor}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Governed AI Runtime Certification metadata.",
);
console.log(
  "B13.1 module registry repair complete.",
);

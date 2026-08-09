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
    '"/app/settings/platform-readiness/ai-runtime-certification"',
  )
) {
  console.log(
    "Governed AI Runtime Certification metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/settings/platform-readiness/ai-runtime-certification": {
    id: "governed-ai-runtime-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
`;

const markers = [
  `  "/app/settings/platform-readiness": {`,
  `  "/app/settings/platform-readiness/rc1": {`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate platform readiness registry metadata anchor.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Governed AI Runtime Certification metadata.",
);

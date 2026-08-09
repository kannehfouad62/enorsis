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
    '"/app/automation/orchestrator/signals"',
  )
) {
  console.log(
    "Orchestration Resume Signals metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/automation/orchestrator/signals": {
    id: "autonomous-orchestration-resume-signals",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const markers = [
  `  "/app/automation/orchestrator/escalations": {
    id: "autonomous-orchestration-escalation-recovery",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`,
  `  "/app/automation/orchestrator": {
    id: "autonomous-procurement-orchestrator",
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
    "Could not locate B11 registry metadata anchor.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Orchestration Resume Signals metadata.",
);

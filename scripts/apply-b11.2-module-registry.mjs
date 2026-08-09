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
    '"/app/automation/orchestrator/escalations"',
  )
) {
  console.log(
    "Orchestration SLA, Escalation & Recovery metadata already present.",
  );
  process.exit(0);
}

const entry = `  "/app/automation/orchestrator/escalations": {
    id: "autonomous-orchestration-escalation-recovery",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

const marker = `  "/app/automation/orchestrator": {
    id: "autonomous-procurement-orchestrator",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Autonomous Procurement Orchestrator registry metadata.",
  );
}

source = source.replace(marker, `${marker}${entry}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Orchestration SLA, Escalation & Recovery metadata.",
);

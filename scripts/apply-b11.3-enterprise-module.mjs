#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

if (
  source.includes(
    'href: "/app/automation/orchestrator/signals"',
  )
) {
  console.log(
    "Orchestration Resume Signals already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Orchestration Resume Signals",
    description:
      "Receive idempotent internal lifecycle signals and resume autonomous procurement only after persisted governance conditions are independently verified.",
    href: "/app/automation/orchestrator/signals",
    icon: BellRing,
    group: "Automation",
  },

`;

const markers = [
  `  {
    title: "Orchestration SLA, Escalation & Recovery",`,
  `  {
    title: "Autonomous Procurement Orchestrator",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B11 Automation module anchor.",
  );
}

if (!source.includes("  BellRing,\n")) {
  const importMarkers = [
    "  ShieldAlert,\n",
    "  Workflow,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for BellRing.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  BellRing,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Orchestration Resume Signals under Automation.",
);

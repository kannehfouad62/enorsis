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
    'href: "/app/automation/orchestrator/escalations"',
  )
) {
  console.log(
    "Orchestration SLA, Escalation & Recovery already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Orchestration SLA, Escalation & Recovery",
    description:
      "Detect aging autonomous-procurement runs, manage escalations, and recover failed orchestration without bypassing human governance gates.",
    href: "/app/automation/orchestrator/escalations",
    icon: ShieldAlert,
    group: "Automation",
  },

`;

const marker = `  {
    title: "Autonomous Procurement Orchestrator",`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Autonomous Procurement Orchestrator module anchor.",
  );
}

if (!source.includes("  ShieldAlert,\n")) {
  const importMarkers = [
    "  Workflow,\n",
    "  ShieldCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for ShieldAlert.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  ShieldAlert,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Orchestration SLA, Escalation & Recovery under Automation.",
);

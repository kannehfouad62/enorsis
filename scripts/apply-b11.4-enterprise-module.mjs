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
    'href: "/app/automation/orchestrator/observability"',
  )
) {
  console.log(
    "Orchestration Observability already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Orchestration Observability",
    description:
      "Monitor autonomous procurement run traces, cycle time, completion rates, human-gate aging, escalations and event-driven resume performance.",
    href: "/app/automation/orchestrator/observability",
    icon: Activity,
    group: "Automation",
  },

`;

const markers = [
  `  {
    title: "Orchestration Resume Signals",`,
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

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Orchestration Observability under Automation.",
);

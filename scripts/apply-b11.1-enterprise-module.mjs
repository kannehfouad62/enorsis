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
    'href: "/app/automation/orchestrator"',
  )
) {
  console.log(
    "Autonomous Procurement Orchestrator already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Autonomous Procurement Orchestrator",
    description:
      "Coordinate human-released autonomous procurement decisions through controlled adapters and governed native draft execution with pause/resume controls.",
    href: "/app/automation/orchestrator",
    icon: Workflow,
    group: "Automation",
  },

`;

const markers = [
  `  {
    title: "Autonomous Procurement Planning",`,
  `  {
    title: "Autonomous Strategy & Savings",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate an autonomous automation module anchor.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Autonomous Procurement Orchestrator under Automation.",
);

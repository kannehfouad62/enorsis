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
    'href: "/app/automation/autonomous-planning"',
  )
) {
  console.log(
    "Autonomous Procurement Planning already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Autonomous Procurement Planning",
    description:
      "Generate evidence-backed procurement plans from predictive intelligence, supplier matching and digital-twin risk with mandatory human approval.",
    href: "/app/automation/autonomous-planning",
    icon: ClipboardCheck,
    group: "Automation",
  },

`;

const markers = [
  `  {
    title: "AI Automation Copilot",`,
  `  {
    title: "Workflow Automation",`,
  `  {
    title: "Automation Runtime",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate an Automation module anchor.",
  );
}

if (!source.includes("  ClipboardCheck,\n")) {
  const importMarkers = [
    "  Bot,\n",
    "  CheckCircle2,\n",
    "  Workflow,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for ClipboardCheck.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  ClipboardCheck,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Autonomous Procurement Planning under Automation.",
);

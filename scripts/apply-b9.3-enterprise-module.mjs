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
    'href: "/app/governance/autonomous-execution"',
  )
) {
  console.log(
    "Controlled Autonomous Execution already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Controlled Autonomous Execution",
    description:
      "Stage approved AI-driven procurement actions, evaluate policy boundaries, require human release and create controlled workflow handoffs.",
    href: "/app/governance/autonomous-execution",
    icon: ShieldCheck,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Autonomous Strategy & Savings",`,
  `  {
    title: "Autonomous Procurement Planning",`,
  `  {
    title: "AI Governance",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a stable Enterprise Modules anchor for B9.3.",
  );
}

if (!source.includes("  ShieldCheck,\n")) {
  const importMarkers = [
    "  Lightbulb,\n",
    "  ClipboardCheck,\n",
    "  Shield,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for ShieldCheck.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  ShieldCheck,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Controlled Autonomous Execution under Governance.",
);

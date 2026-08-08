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
    'href: "/app/governance/autonomous-execution/adapters"',
  )
) {
  console.log(
    "Controlled Transaction Adapters already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Controlled Transaction Adapters",
    description:
      "Prepare idempotent operator-controlled handoffs from released autonomous execution envelopes into native Enorsis workflows.",
    href: "/app/governance/autonomous-execution/adapters",
    icon: Cable,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Controlled Autonomous Execution",`,
  `  {
    title: "Autonomous Strategy & Savings",`,
  `  {
    title: "Autonomous Procurement Planning",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B9 Enterprise Modules anchor.",
  );
}

if (!source.includes("  Cable,\n")) {
  const importMarkers = [
    "  ShieldCheck,\n",
    "  Lightbulb,\n",
    "  ClipboardCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for Cable.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  Cable,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Controlled Transaction Adapters under Governance.",
);

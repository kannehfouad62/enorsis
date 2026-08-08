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
    'href: "/app/automation/autonomous-recommendations"',
  )
) {
  console.log(
    "Autonomous Strategy, Savings & Risk Recommendations already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Autonomous Strategy & Savings",
    description:
      "Generate human-governed strategy recommendations, savings hypotheses and risk-mitigation actions from approved plans and predictive evidence.",
    href: "/app/automation/autonomous-recommendations",
    icon: Lightbulb,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Autonomous Procurement Planning",`,
  `  {
    title: "Procurement Digital Twin",`,
  `  {
    title: "Predictive Capacity Planning",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate an Intelligence module anchor for B9.2.",
  );
}

if (!source.includes("  Lightbulb,\n")) {
  const importMarkers = [
    "  ClipboardCheck,\n",
    "  GitCompareArrows,\n",
    "  Gauge,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for Lightbulb.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  Lightbulb,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Autonomous Strategy & Savings under Intelligence.",
);

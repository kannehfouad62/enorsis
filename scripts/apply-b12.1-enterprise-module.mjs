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
    'href: "/app/analytics/outcome-learning"',
  )
) {
  console.log(
    "Closed-Loop Outcome Learning already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Closed-Loop Outcome Learning",
    description:
      "Compare autonomous procurement predictions with observed outcomes, calculate variance, preserve evidence and validate learning-quality results.",
    href: "/app/analytics/outcome-learning",
    icon: BrainCircuit,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Predictive Procurement Forecasting",`,
  `  {
    title: "Procurement Digital Twin",`,
  `  {
    title: "Predictive Inventory Optimization",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate an Intelligence module anchor.",
  );
}

if (!source.includes("  BrainCircuit,\n")) {
  const importMarkers = [
    "  Activity,\n",
    "  Workflow,\n",
    "  Bot,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for BrainCircuit.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  BrainCircuit,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Closed-Loop Outcome Learning under Intelligence.",
);

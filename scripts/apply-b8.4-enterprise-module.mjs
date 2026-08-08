#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('href: "/app/analytics/digital-twin"')) {
  console.log("Procurement Digital Twin already registered.");
  process.exit(0);
}

const entry = `  {
    title: "Procurement Digital Twin",
    description:
      "Run governed what-if simulations across demand, supplier disruption, lead times, cost, inbound flow, inventory and capacity.",
    href: "/app/analytics/digital-twin",
    icon: GitCompareArrows,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Predictive Capacity Planning",`,
  `  {
    title: "Predictive Inventory Optimization",`,
  `  {
    title: "Predictive Procurement Forecasting",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate predictive intelligence module anchor.",
  );
}

if (!source.includes("  GitCompareArrows,\n")) {
  const importMarkers = [
    "  Gauge,\n",
    "  Warehouse,\n",
    "  ChartSpline,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for GitCompareArrows.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  GitCompareArrows,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);

fs.writeFileSync(file, source);
console.log(
  "Registered Procurement Digital Twin under Intelligence.",
);

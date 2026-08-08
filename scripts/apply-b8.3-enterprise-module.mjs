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
    'href: "/app/analytics/predictive-capacity"',
  )
) {
  console.log(
    "Predictive Capacity Planning already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Predictive Capacity Planning",
    description:
      "Forecast location inventory-unit capacity pressure, projected utilization, capacity gaps and redistribution needs.",
    href: "/app/analytics/predictive-capacity",
    icon: Gauge,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Predictive Inventory Optimization",`,
  `  {
    title: "Predictive Procurement Forecasting",`,
  `  {
    title: "Spend Intelligence",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a predictive intelligence module anchor.",
  );
}

if (!source.includes("  Gauge,\n")) {
  const importMarkers = [
    "  Warehouse,\n",
    "  ChartSpline,\n",
    "  GaugeCircle,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for Gauge.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  Gauge,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log(
  "Registered Predictive Capacity Planning under Intelligence.",
);

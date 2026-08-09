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
    'href: "/app/analytics/outcome-learning/proposals"',
  )
) {
  console.log(
    "Learning Recommendations & Calibration Proposals already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Learning Recommendations & Calibration Proposals",
    description:
      "Generate evidence-backed AI calibration and recommendation-rule proposals for explicit human governance review.",
    href: "/app/analytics/outcome-learning/proposals",
    icon: Lightbulb,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Prediction Accuracy & Calibration",`,
  `  {
    title: "Native Outcome Reconciliation",`,
  `  {
    title: "Closed-Loop Outcome Learning",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a closed-loop Intelligence module anchor.",
  );
}

if (!source.includes("  Lightbulb,\n")) {
  const importMarkers = [
    "  Gauge,\n",
    "  BrainCircuit,\n",
    "  Activity,\n",
  ];

  const importMarker =
    importMarkers.find(
      (candidate) =>
        source.includes(candidate),
    );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for Lightbulb.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  Lightbulb,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Learning Recommendations & Calibration Proposals under Intelligence.",
);

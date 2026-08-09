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
    'href: "/app/analytics/outcome-learning/policies"',
  )
) {
  console.log(
    "Learning Policy Activation & Versioning already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Learning Policy Activation & Versioning",
    description:
      "Materialize approved learning proposals into versioned policy candidates with explicit activation, supersession and rollback controls.",
    href: "/app/analytics/outcome-learning/policies",
    icon: Versions,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Learning Recommendations & Calibration Proposals",`,
  `  {
    title: "Prediction Accuracy & Calibration",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a closed-loop Intelligence module anchor.",
  );
}

if (!source.includes("  Versions,\n")) {
  const importMarkers = [
    "  Lightbulb,\n",
    "  Gauge,\n",
    "  BrainCircuit,\n",
  ];

  const importMarker =
    importMarkers.find(
      (candidate) =>
        source.includes(candidate),
    );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for Versions.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  Versions,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Learning Policy Activation & Versioning under Intelligence.",
);

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
    'href: "/app/analytics/outcome-learning/calibration"',
  )
) {
  console.log(
    "Prediction Accuracy & Calibration already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Prediction Accuracy & Calibration",
    description:
      "Measure validated prediction error, recommendation effectiveness, workflow performance and confidence calibration from closed-loop procurement outcomes.",
    href: "/app/analytics/outcome-learning/calibration",
    icon: Gauge,
    group: "Intelligence",
  },

`;

const markers = [
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

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Prediction Accuracy & Calibration under Intelligence.",
);

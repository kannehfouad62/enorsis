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
    'href: "/app/analytics/outcome-learning/runtime-adoption"',
  )
) {
  console.log(
    "Predictive Procurement Policy Adoption already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Predictive Procurement Policy Adoption",
    description:
      "Control live learning-policy adoption for predictive procurement through OFF, SHADOW and ENFORCED runtime modes.",
    href: "/app/analytics/outcome-learning/runtime-adoption",
    icon: Eye,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Runtime Policy Decision Traceability",`,
  `  {
    title: "Runtime Policy Consumption & Guardrails",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B12 runtime-policy module anchor.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Predictive Procurement Policy Adoption under Intelligence.",
);

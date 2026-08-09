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
    'href: "/app/analytics/outcome-learning/runtime-promotion"',
  )
) {
  console.log(
    "Governed Runtime Promotion & Rollback already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Governed Runtime Promotion & Rollback",
    description:
      "Assess SHADOW evidence, require human approval for ENFORCED promotion, and monitor divergence, fallback and denial rollback triggers.",
    href: "/app/analytics/outcome-learning/runtime-promotion",
    icon: ShieldCheck,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Predictive Procurement Policy Adoption",`,
  `  {
    title: "Runtime Policy Decision Traceability",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B12 runtime adoption module anchor.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Governed Runtime Promotion & Rollback under Intelligence.",
);

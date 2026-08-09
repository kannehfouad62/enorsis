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
    'href: "/app/analytics/outcome-learning/runtime-traces"',
  )
) {
  console.log(
    "Runtime Policy Decision Traceability already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Runtime Policy Decision Traceability",
    description:
      "Audit runtime learning-policy decisions with policy version, fallback source, resolved threshold, input value and decision result.",
    href: "/app/analytics/outcome-learning/runtime-traces",
    icon: Activity,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Runtime Policy Consumption & Guardrails",`,
  `  {
    title: "Learning Policy Activation & Versioning",`,
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
  "Registered Runtime Policy Decision Traceability under Intelligence.",
);

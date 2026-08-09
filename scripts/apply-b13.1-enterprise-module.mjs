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
    'href: "/app/settings/platform-readiness/ai-runtime-certification"',
  )
) {
  console.log(
    "Governed AI Runtime Certification already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Governed AI Runtime Certification",
    description:
      "Run formal non-destructive certification across AI runtime policies, fallbacks, traces, SHADOW behavior, promotion guardrails and human governance.",
    href: "/app/settings/platform-readiness/ai-runtime-certification",
    icon: ShieldCheck,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Platform Readiness",`,
  `  {
    title: "Release Candidate",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a Governance or readiness module anchor.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Governed AI Runtime Certification under Governance.",
);

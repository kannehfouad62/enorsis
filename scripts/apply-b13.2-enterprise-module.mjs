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
    'href: "/app/settings/platform-readiness/ai-runtime-health"',
  )
) {
  console.log(
    "AI Runtime Health & Production Monitoring already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "AI Runtime Health & Production Monitoring",
    description:
      "Monitor governed AI runtime health, policy usage, fallback, denials, clamping, trace integrity, certification state and adoption mode.",
    href: "/app/settings/platform-readiness/ai-runtime-health",
    icon: Activity,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Governed AI Runtime Certification",`,
  `  {
    title: "Platform Readiness",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate B13 Governance module anchor.",
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered AI Runtime Health & Production Monitoring under Governance.",
);

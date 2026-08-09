#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/final-release-certification";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "Final Enterprise Release Certification already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Final Enterprise Release Certification",
    description:
      "Aggregate AI runtime, performance, security, runtime-health and cross-engine governance evidence into a final enterprise release decision.",
    href: "${href}",
    icon: ShieldCheck,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Security & Governance Certification",`,
  `  {
    title: "Enterprise Scale & Performance Certification",`,
  `  {
    title: "Enterprise AI Control Center",`,
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
  "Registered Final Enterprise Release Certification under Governance.",
);

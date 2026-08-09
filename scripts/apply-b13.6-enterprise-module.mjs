#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/performance-certification";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "Enterprise Scale & Performance Certification already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Enterprise Scale & Performance Certification",
    description:
      "Certify critical database, governance, observability and AI aggregation paths with bounded read-only latency and concurrency probes.",
    href: "${href}",
    icon: Activity,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Enterprise AI Control Center",`,
  `  {
    title: "Cross-Engine Intelligence Governance",`,
  `  {
    title: "Governed Intelligence Engine Adoption",`,
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
  "Registered Enterprise Scale & Performance Certification under Governance.",
);

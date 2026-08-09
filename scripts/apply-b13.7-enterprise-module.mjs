#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/security-certification";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "Security & Governance Certification already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Security & Governance Certification",
    description:
      "Certify tenant isolation, human governance, runtime transition boundaries, audit provenance, secret handling and autonomous-execution controls.",
    href: "${href}",
    icon: ShieldCheck,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Enterprise Scale & Performance Certification",`,
  `  {
    title: "Enterprise AI Control Center",`,
  `  {
    title: "Cross-Engine Intelligence Governance",`,
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
  "Registered Security & Governance Certification under Governance.",
);

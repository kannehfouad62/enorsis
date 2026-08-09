#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/ai-control-center";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "Enterprise AI Control Center already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Enterprise AI Control Center",
    description:
      "Centralize AI provider readiness, certification, runtime health, engine adoption, policies, traces, promotion state and cross-engine governance.",
    href: "${href}",
    icon: Cpu,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Cross-Engine Intelligence Governance",`,
  `  {
    title: "Governed Intelligence Engine Adoption",`,
  `  {
    title: "AI Runtime Health & Production Monitoring",`,
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
  "Registered Enterprise AI Control Center under Governance.",
);

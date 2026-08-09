#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source =
  fs.readFileSync(
    file,
    "utf8",
  );

const href =
  "/app/settings/platform-readiness/ai-engine-adoption";

if (
  source.includes(
    `href: "${href}"`,
  )
) {
  console.log(
    "Governed Intelligence Engine Adoption already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Governed Intelligence Engine Adoption",
    description:
      "Control OFF, SHADOW and ENFORCED runtime-policy adoption independently across predictive procurement, inventory and capacity intelligence.",
    href: "${href}",
    icon: Activity,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "AI Runtime Health & Production Monitoring",`,
  `  {
    title: "Governed AI Runtime Certification",`,
  `  {
    title: "Platform Readiness",`,
];

const marker =
  markers.find(
    (candidate) =>
      source.includes(candidate),
  );

if (!marker) {
  throw new Error(
    "Could not locate B13 Governance module anchor.",
  );
}

source =
  source.replace(
    marker,
    `${entry}${marker}`,
  );

fs.writeFileSync(
  file,
  source,
);

console.log(
  "Registered Governed Intelligence Engine Adoption under Governance.",
);

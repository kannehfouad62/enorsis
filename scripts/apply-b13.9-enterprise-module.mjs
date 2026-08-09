#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source =
  fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/end-to-end-commerce";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "End-to-End Commerce Certification already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "End-to-End Commerce Certification",
    description:
      "Certify the buyer-supplier transaction lifecycle from tenant governance and catalog through purchase order, receiving, warehouse, inventory, invoice, matching and payment.",
    href: "${href}",
    icon: Activity,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Final Enterprise Release Certification",`,
  `  {
    title: "Security & Governance Certification",`,
  `  {
    title: "Enterprise Scale & Performance Certification",`,
];

const marker =
  markers.find((candidate) =>
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
  "Registered End-to-End Commerce Certification under Governance.",
);

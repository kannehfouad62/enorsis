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
    'href: "/app/governance/autonomous-execution/native-drafts/inventory"',
  )
) {
  console.log(
    "Native Inventory Rebalancing Adapter already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Inventory Rebalancing Adapter",
    description:
      "Convert approved autonomous inventory recommendations into real Enorsis TRANSFER movements in DRAFT status without changing stock until native posting.",
    href: "/app/governance/autonomous-execution/native-drafts/inventory",
    icon: ArrowLeftRight,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Native Value Realization Adapter",`,
  `  {
    title: "Native Risk & Resilience Adapter",`,
  `  {
    title: "Native Strategic Sourcing Adapter",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B10 governance module anchor.",
  );
}

if (!source.includes("  ArrowLeftRight,\n")) {
  const importMarkers = [
    "  BadgeDollarSign,\n",
    "  ShieldPlus,\n",
    "  FileSearch2,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for ArrowLeftRight.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  ArrowLeftRight,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Inventory Rebalancing Adapter under Governance.",
);

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
    'href: "/app/governance/autonomous-execution/native-drafts/value-realization"',
  )
) {
  console.log(
    "Native Value Realization Adapter already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Value Realization Adapter",
    description:
      "Convert approved autonomous savings opportunities into real Enorsis Procurement Value Initiatives in QUALIFYING status while preserving finance validation.",
    href: "/app/governance/autonomous-execution/native-drafts/value-realization",
    icon: BadgeDollarSign,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Native Risk & Resilience Adapter",`,
  `  {
    title: "Native Strategic Sourcing Adapter",`,
  `  {
    title: "Native Purchase Request Adapter",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B10 governance module anchor.",
  );
}

if (!source.includes("  BadgeDollarSign,\n")) {
  const importMarkers = [
    "  ShieldPlus,\n",
    "  FileSearch2,\n",
    "  FilePlus2,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for BadgeDollarSign.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  BadgeDollarSign,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Value Realization Adapter under Governance.",
);

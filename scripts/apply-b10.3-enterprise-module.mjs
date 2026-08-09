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
    'href: "/app/governance/autonomous-execution/native-drafts/resilience"',
  )
) {
  console.log(
    "Native Risk & Resilience Adapter already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Risk & Resilience Adapter",
    description:
      "Convert approved autonomous risk-mitigation recommendations into real Enorsis Resilience Plans in DRAFT status while preserving native activation controls.",
    href: "/app/governance/autonomous-execution/native-drafts/resilience",
    icon: ShieldPlus,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Native Strategic Sourcing Adapter",`,
  `  {
    title: "Native Purchase Request Adapter",`,
  `  {
    title: "Governed Native Workflow Drafts",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B10 governance module anchor.",
  );
}

if (!source.includes("  ShieldPlus,\n")) {
  const importMarkers = [
    "  FileSearch2,\n",
    "  FilePlus2,\n",
    "  ShieldCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for ShieldPlus.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  ShieldPlus,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Risk & Resilience Adapter under Governance.",
);

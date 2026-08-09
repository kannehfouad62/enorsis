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
    'href: "/app/governance/autonomous-execution/native-drafts/sourcing"',
  )
) {
  console.log(
    "Native Strategic Sourcing Adapter already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Strategic Sourcing Adapter",
    description:
      "Convert approved autonomous sourcing recommendations into real Enorsis RFP events in DRAFT status while preserving native sourcing governance.",
    href: "/app/governance/autonomous-execution/native-drafts/sourcing",
    icon: FileSearch2,
    group: "Governance",
  },

`;

const markers = [
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

if (!source.includes("  FileSearch2,\n")) {
  const importMarkers = [
    "  FilePlus2,\n",
    "  FileInput,\n",
    "  Cable,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for FileSearch2.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  FileSearch2,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Strategic Sourcing Adapter under Governance.",
);

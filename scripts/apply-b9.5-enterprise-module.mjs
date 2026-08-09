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
    'href: "/app/governance/autonomous-execution/native-drafts"',
  )
) {
  console.log(
    "Governed Native Workflow Drafts already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Governed Native Workflow Drafts",
    description:
      "Materialize activated autonomous transaction adapters into governed native draft objects and bind them to confirmed Enorsis workflow records.",
    href: "/app/governance/autonomous-execution/native-drafts",
    icon: FileInput,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Controlled Transaction Adapters",`,
  `  {
    title: "Controlled Autonomous Execution",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate B9 governance module anchor.",
  );
}

if (!source.includes("  FileInput,\n")) {
  const importMarkers = [
    "  Cable,\n",
    "  ShieldCheck,\n",
    "  ClipboardCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for FileInput.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  FileInput,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Governed Native Workflow Drafts under Governance.",
);

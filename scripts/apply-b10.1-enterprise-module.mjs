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
    'href: "/app/governance/autonomous-execution/native-drafts/purchase-requests"',
  )
) {
  console.log(
    "Native Purchase Request Adapter already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Purchase Request Adapter",
    description:
      "Convert approved autonomous procurement handoffs into real Enorsis Purchase Requests in DRAFT status while preserving native approvals.",
    href: "/app/governance/autonomous-execution/native-drafts/purchase-requests",
    icon: FilePlus2,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Governed Native Workflow Drafts",`,
  `  {
    title: "Controlled Transaction Adapters",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a B9/B10 governance module anchor.",
  );
}

if (!source.includes("  FilePlus2,\n")) {
  const importMarkers = [
    "  FileInput,\n",
    "  Cable,\n",
    "  ShieldCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate a stable Lucide import anchor for FilePlus2.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  FilePlus2,\n`,
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);

console.log(
  "Registered Native Purchase Request Adapter under Governance.",
);

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href =
  "/app/settings/platform-readiness/cross-engine-governance";

if (source.includes(`href: "${href}"`)) {
  console.log(
    "Cross-Engine Intelligence Governance already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Cross-Engine Intelligence Governance",
    description:
      "Detect and govern conflicts across predictive procurement, inventory and capacity intelligence using explicit precedence and human resolution.",
    href: "${href}",
    icon: GitMerge,
    group: "Governance",
  },

`;

const markers = [
  `  {
    title: "Governed Intelligence Engine Adoption",`,
  `  {
    title: "AI Runtime Health & Production Monitoring",`,
  `  {
    title: "Governed AI Runtime Certification",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate B13 Governance module anchor.",
  );
}

if (!source.includes("  GitMerge,\n")) {
  const importMarkers = [
    "  GitBranch,\n",
    "  Activity,\n",
    "  ShieldCheck,\n",
  ];

  const importMarker = importMarkers.find((candidate) =>
    source.includes(candidate),
  );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for GitMerge.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  GitMerge,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Cross-Engine Intelligence Governance under Governance.",
);

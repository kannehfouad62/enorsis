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
    'href: "/app/analytics/outcome-learning/runtime-policy"',
  )
) {
  console.log(
    "Runtime Policy Consumption & Guardrails already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Runtime Policy Consumption & Guardrails",
    description:
      "Resolve selected ACTIVE learning policies through bounded defaults, allowlists and audit-aware runtime guardrails.",
    href: "/app/analytics/outcome-learning/runtime-policy",
    icon: SlidersHorizontal,
    group: "Intelligence",
  },

`;

const markers = [
  `  {
    title: "Learning Policy Activation & Versioning",`,
  `  {
    title: "Learning Recommendations & Calibration Proposals",`,
];

const marker = markers.find((candidate) =>
  source.includes(candidate),
);

if (!marker) {
  throw new Error(
    "Could not locate a closed-loop Intelligence module anchor.",
  );
}

if (!source.includes("  SlidersHorizontal,\n")) {
  const importMarkers = [
    "  GitBranch,\n",
    "  Lightbulb,\n",
    "  Gauge,\n",
  ];

  const importMarker =
    importMarkers.find(
      (candidate) =>
        source.includes(candidate),
    );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for SlidersHorizontal.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  SlidersHorizontal,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Runtime Policy Consumption & Guardrails under Intelligence.",
);

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
    'href: "/app/analytics/outcome-learning/reconciliation"',
  )
) {
  console.log(
    "Native Outcome Reconciliation already registered.",
  );
  process.exit(0);
}

const entry = `  {
    title: "Native Outcome Reconciliation",
    description:
      "Automatically reconcile observable native procurement facts into closed-loop outcome metrics without inferring unsupported business results.",
    href: "/app/analytics/outcome-learning/reconciliation",
    icon: DatabaseZap,
    group: "Intelligence",
  },

`;

const marker = `  {
    title: "Closed-Loop Outcome Learning",`;

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Closed-Loop Outcome Learning module anchor.",
  );
}

if (!source.includes("  DatabaseZap,\n")) {
  const importMarkers = [
    "  BrainCircuit,\n",
    "  Activity,\n",
  ];

  const importMarker =
    importMarkers.find(
      (candidate) =>
        source.includes(candidate),
    );

  if (!importMarker) {
    throw new Error(
      "Could not locate Lucide import anchor for DatabaseZap.",
    );
  }

  source = source.replace(
    importMarker,
    `${importMarker}  DatabaseZap,\n`,
  );
}

source = source.replace(
  marker,
  `${entry}${marker}`,
);

fs.writeFileSync(file, source);

console.log(
  "Registered Native Outcome Reconciliation under Intelligence.",
);

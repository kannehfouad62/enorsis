#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/types.ts",
);

let source = fs.readFileSync(file, "utf8");

const oldUnion = `export type ModuleGroup =
  | "Procurement"
  | "Suppliers"
  | "Governance"
  | "Intelligence"
  | "Platform";`;

const newUnion = `export type ModuleGroup =
  | "Procurement"
  | "Suppliers"
  | "Governance"
  | "Intelligence"
  | "Platform"
  | "Automation";`;

if (source.includes(newUnion)) {
  console.log("Automation is already present in ModuleGroup.");
  process.exit(0);
}

if (!source.includes(oldUnion)) {
  throw new Error(
    "Could not locate the current ModuleGroup union in src/core/modules/types.ts.",
  );
}

source = source.replace(oldUnion, newUnion);

fs.writeFileSync(file, source);

console.log(
  "Added Automation to src/core/modules/types.ts ModuleGroup union.",
);
console.log(
  "B11.1 module group types repair v5 complete.",
);

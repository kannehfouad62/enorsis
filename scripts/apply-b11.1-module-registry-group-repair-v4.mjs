#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

const declarationCandidates = [
  "export type ModuleGroup",
  "type ModuleGroup",
];

const declarationStart = declarationCandidates
  .map((candidate) => ({
    candidate,
    index: source.indexOf(candidate),
  }))
  .filter((item) => item.index >= 0)
  .sort((a, b) => a.index - b.index)[0];

if (!declarationStart) {
  throw new Error(
    "Could not locate ModuleGroup declaration in registry.ts.",
  );
}

const start = declarationStart.index;
const tail = source.slice(start);

const semicolon = tail.indexOf(";");

if (semicolon < 0) {
  throw new Error(
    "Could not determine ModuleGroup declaration boundary.",
  );
}

const declaration = tail.slice(0, semicolon + 1);

if (declaration.includes('"Automation"')) {
  console.log(
    "Automation is already present in ModuleGroup.",
  );
  process.exit(0);
}

const updatedDeclaration = declaration.replace(
  /;$/,
  '\n  | "Automation";',
);

source =
  source.slice(0, start) +
  updatedDeclaration +
  source.slice(start + declaration.length);

fs.writeFileSync(file, source);

console.log(
  "Added Automation directly to ModuleGroup union.",
);
console.log(
  "B11.1 module registry group repair v4 complete.",
);

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const declarationStartCandidates = [
  "export type EnterpriseModuleLink",
  "type EnterpriseModuleLink",
  "export interface EnterpriseModuleLink",
  "interface EnterpriseModuleLink",
];

const declarationStart = declarationStartCandidates
  .map((candidate) => ({
    candidate,
    index: source.indexOf(candidate),
  }))
  .filter((item) => item.index >= 0)
  .sort((a, b) => a.index - b.index)[0];

if (!declarationStart) {
  throw new Error(
    "Could not locate EnterpriseModuleLink declaration.",
  );
}

const start = declarationStart.index;
const tail = source.slice(start);

const declarationEndOffset =
  tail.indexOf("\n};") >= 0
    ? tail.indexOf("\n};") + 3
    : tail.indexOf("\n}") >= 0
      ? tail.indexOf("\n}") + 2
      : -1;

if (declarationEndOffset < 0) {
  throw new Error(
    "Could not determine EnterpriseModuleLink declaration boundary.",
  );
}

const declaration = tail.slice(0, declarationEndOffset);

const groupProperty = declaration.match(
  /group\s*:\s*([\s\S]*?);/,
);

if (!groupProperty) {
  throw new Error(
    "Could not locate EnterpriseModuleLink.group property.",
  );
}

const currentUnion = groupProperty[1];

if (currentUnion.includes('"Automation"')) {
  console.log(
    "Automation is already present in EnterpriseModuleLink.group.",
  );
  process.exit(0);
}

const replacement =
  `group: ${currentUnion.trimEnd()}\n    | "Automation";`;

const updatedDeclaration = declaration.replace(
  groupProperty[0],
  replacement,
);

source =
  source.slice(0, start) +
  updatedDeclaration +
  source.slice(start + declaration.length);

fs.writeFileSync(file, source);

console.log(
  "Added Automation directly to EnterpriseModuleLink.group union.",
);
console.log(
  "B11.1 navigation group repair v3 complete.",
);

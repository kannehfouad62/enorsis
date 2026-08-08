#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const targetHref =
  'href: "/app/automation/autonomous-planning"';

const targetIndex = source.indexOf(targetHref);

if (targetIndex === -1) {
  throw new Error(
    "Could not locate Autonomous Procurement Planning module entry.",
  );
}

const entryStart = source.lastIndexOf("  {", targetIndex);
const entryEnd = source.indexOf("  },", targetIndex);

if (entryStart === -1 || entryEnd === -1) {
  throw new Error(
    "Could not determine Autonomous Procurement Planning module boundaries.",
  );
}

const end = entryEnd + 4;
const entry = source.slice(entryStart, end);

if (entry.includes('group: "Intelligence"')) {
  console.log(
    "Autonomous Procurement Planning is already grouped under Intelligence.",
  );
  process.exit(0);
}

if (!entry.includes('group: "Automation"')) {
  throw new Error(
    'Expected group: "Automation" in Autonomous Procurement Planning entry.',
  );
}

const repaired = entry.replace(
  'group: "Automation"',
  'group: "Intelligence"',
);

source =
  source.slice(0, entryStart) +
  repaired +
  source.slice(end);

fs.writeFileSync(file, source);

console.log(
  "Moved Autonomous Procurement Planning into the existing Intelligence group.",
);
console.log("B9.1 Enterprise Modules group repair complete.");

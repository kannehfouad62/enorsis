#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/predictive-inventory/actions.ts",
);

let source = fs.readFileSync(file, "utf8");

const before = source;

// Remove role literals that do not exist in EnorsisRole.
// Handle optional trailing commas and arbitrary formatting.
source = source.replace(
  /^\s*"INVENTORY_MANAGER",?\s*$/gm,
  "",
);
source = source.replace(
  /^\s*"WAREHOUSE_MANAGER",?\s*$/gm,
  "",
);

// Ensure valid operational governance roles are present in the
// predictive inventory action's role array.
const rolesAnchor = /const\s+roles\s*=\s*\[([\s\S]*?)\]\s*as\s+const;/m;
const match = source.match(rolesAnchor);

if (!match) {
  throw new Error(
    "Could not locate the B8.2 predictive inventory roles array.",
  );
}

let roleBody = match[1];

for (const role of [
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
]) {
  if (!roleBody.includes(`"${role}"`)) {
    roleBody += `\n  "${role}",`;
  }
}

source = source.replace(
  rolesAnchor,
  `const roles = [${roleBody}\n] as const;`,
);

// Collapse excessive blank lines inside the file created by removals.
source = source.replace(/\n{3,}/g, "\n\n");

if (source === before) {
  console.log(
    "B8.2 authorization roles already aligned; no source changes required.",
  );
} else {
  fs.writeFileSync(file, source);
  console.log(
    "Removed invalid INVENTORY_MANAGER/WAREHOUSE_MANAGER roles.",
  );
  console.log(
    "Ensured RISK_COMPLIANCE and SUPPLIER_MANAGER access.",
  );
}

console.log("B8.2 authorization repair v2 complete.");

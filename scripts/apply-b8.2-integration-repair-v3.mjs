#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/predictive-inventory/actions.ts",
);

let source = fs.readFileSync(file, "utf8");

const rolesPattern =
  /const\s+roles\s*=\s*\[[\s\S]*?\]\s*as\s+const;/m;

if (!rolesPattern.test(source)) {
  throw new Error(
    "Could not locate the predictive inventory roles declaration.",
  );
}

const replacement = `const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;`;

source = source.replace(rolesPattern, replacement);

fs.writeFileSync(file, source);

console.log("Rebuilt B8.2 roles declaration with valid Enorsis roles.");
console.log("B8.2 authorization repair v3 complete.");

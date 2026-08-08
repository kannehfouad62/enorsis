#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/predictive-inventory/actions.ts",
);

let source = fs.readFileSync(file, "utf8");

const oldBlock = `const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "INVENTORY_MANAGER",
  "WAREHOUSE_MANAGER",
  "FINANCE",
] as const;`;

const newBlock = `const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  console.log("Aligned B8.2 action roles with EnorsisRole.");
} else if (source.includes('"RISK_COMPLIANCE"') && source.includes('"SUPPLIER_MANAGER"')) {
  console.log("B8.2 action roles already aligned.");
} else {
  throw new Error(
    "Could not locate the B8.2 predictive inventory role block.",
  );
}

fs.writeFileSync(file, source);
console.log("B8.2 authorization repair complete.");

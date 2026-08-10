#!/usr/bin/env node
import fs from "node:fs";

const protectedRoots = ['requests', 'sourcing', 'suppliers', 'buying', 'categories', 'demand-planning', 'planning', 'procure-to-pay', 'purchasing', 'replenishment', 'requisition-to-order', 'inventory', 'inventory-operations', 'inventory-financial-valuation', 'inventory-reconciliation', 'inventory-traceability', 'warehouse-operations', 'warehouse-fulfillment', 'value-realization', 'analytics', 'ai', 'automation', 'agents', 'governance', 'executive', 'resilience'];

const missing = protectedRoots
  .map((root) => `src/app/app/${root}/layout.tsx`)
  .filter((path) => !fs.existsSync(path));

for (const extra of [
  "src/app/app/supplier-portal/layout.tsx",
  "src/app/app/marketplace/suppliers/layout.tsx",
  "src/app/app/marketplace/matching/layout.tsx",
]) {
  if (!fs.existsSync(extra)) missing.push(extra);
}

if (missing.length) {
  console.error("Commercial persona guards incomplete:");
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

console.log(`Tenant commercial persona guard validation passed (${protectedRoots.length + 3} guarded route families).`);

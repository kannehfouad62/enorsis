#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const service = fs.readFileSync(
  "src/core/marketplace/tenant-self-supplier.ts",
  "utf8",
);
const actions = fs.readFileSync(
  "src/modules/marketplace-catalog/actions.ts",
  "utf8",
);
const queries = fs.readFileSync(
  "src/modules/marketplace-catalog/queries.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);

if (!service.includes("isTenantSelfProfile: true")) {
  failures.push("self supplier profile marker missing");
}

if (!actions.includes("ensureTenantSelfSupplierProfile")) {
  failures.push("create action does not resolve self supplier identity");
}

if (actions.includes('const supplierId = field(data, "supplierId")')) {
  failures.push("create action still trusts client-posted supplierId");
}

if (!queries.includes("selfSupplier")) {
  failures.push("marketplace query does not expose self supplier identity");
}

if (page.includes('name="supplierId"')) {
  failures.push("supplier selector still exists in publish form");
}

if (!page.includes('data.commercialPersona !== "SUPPLIER"')) {
  failures.push("buyer-only marketplace header links are not persona-aware");
}

if (failures.length) {
  console.error("B13.10.4C validation failed:");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(
  "B13.10.4C supplier self-identity and persona-aware marketplace navigation validation passed.",
);

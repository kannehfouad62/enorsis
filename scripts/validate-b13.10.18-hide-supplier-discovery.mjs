#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const queries = fs.readFileSync(
  "src/modules/marketplace-trust/queries.ts",
  "utf8",
);

const page = fs.readFileSync(
  "src/app/app/marketplace/trust/page.tsx",
  "utf8",
);

if (
  !queries.includes(
    "commercialPersona: tenant.commercialPersona",
  )
) {
  failures.push(
    "Marketplace Trust workspace does not expose tenant commercial persona.",
  );
}

if (
  !page.includes(
    'data.commercialPersona !== "SUPPLIER"',
  )
) {
  failures.push(
    "Supplier Discovery is not hidden for supplier-only tenants.",
  );
}

if (
  !page.includes(
    'href="/app/marketplace/suppliers"',
  )
) {
  failures.push(
    "Buyer-capable Supplier Discovery link was removed entirely.",
  );
}

if (failures.length) {
  console.error("B13.10.18 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.18 Supplier Discovery visibility validation passed.",
);

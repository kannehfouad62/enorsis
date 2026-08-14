#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/app-shell/AppShell.tsx",
  "utf8",
);

const failures = [];

if (
  !source.includes(
    `!isPlatformOperator &&
        ["SUPPLIER", "BUYER_SUPPLIER"].includes(`,
  )
) {
  failures.push(
    "Tenant identity block can still expose Seller Profile to platform operators.",
  );
}

if (
  !source.includes(
    `if (sellerOnly) {
                return (
                  !isPlatformOperator &&`,
  )
) {
  failures.push(
    "sellerOnly navigation is not explicitly blocked for platform operators.",
  );
}

if (
  source.includes(
    `isPlatformOperator ||
                (
                  (!("sellerOnly" in item)`,
  )
) {
  failures.push(
    "Old platform-operator sellerOnly bypass is still present.",
  );
}

if (
  !source.includes(
    'href: "/app/marketplace/seller-profile"',
  )
) {
  failures.push(
    "Seller Profile navigation entry was removed instead of correctly scoped.",
  );
}

if (failures.length) {
  console.error("B13.10.19 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.19 Platform Admin seller-profile visibility validation passed.",
);

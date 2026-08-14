#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const catalog = read(
  "src/app/app/marketplace/catalog/page.tsx",
);
const profile = read(
  "src/app/app/marketplace/seller-profile/page.tsx",
);
const actions = read(
  "src/modules/marketplace-seller-profile/actions.ts",
);
const identity = read(
  "src/core/marketplace/tenant-self-supplier.ts",
);

if (
  !catalog.includes(
    'href="/app/marketplace/seller-profile"',
  )
) {
  failures.push(
    "Marketplace Seller Profile is still not clickable.",
  );
}

if (!profile.includes("Business Profile")) {
  failures.push(
    "Dedicated Seller Business Profile page is missing.",
  );
}

if (
  !profile.includes(
    "SupplierMarketplaceLogoUpload",
  )
) {
  failures.push(
    "Seller profile page does not manage the company logo.",
  );
}

if (
  !actions.includes(
    "marketplace.supplier.profile.update",
  )
) {
  failures.push(
    "Seller business information updates are not audit logged.",
  );
}

if (
  !actions.includes(
    "isTenantSelfProfile: true",
  )
) {
  failures.push(
    "Seller profile update is not tenant-self scoped.",
  );
}

if (
  identity.includes(
    "existing.tradingName !== tenant.name",
  )
) {
  failures.push(
    "Self-supplier sync would still overwrite seller-managed trading names.",
  );
}

if (failures.length) {
  console.error("B13.10.16 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.16 clickable seller business profile validation passed.",
);

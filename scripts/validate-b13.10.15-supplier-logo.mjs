#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const schema = read("prisma/schema.prisma");
const query = read(
  "src/modules/marketplace-catalog/queries.ts",
);
const catalog = read(
  "src/app/app/marketplace/catalog/page.tsx",
);
const directory = read(
  "src/components/marketplace/MarketplaceVendorDirectory.tsx",
);
const upload = read(
  "src/components/marketplace/SupplierMarketplaceLogoUpload.tsx",
);
const register = read(
  "src/app/api/marketplace/supplier-logo/register/route.ts",
);
const serve = read(
  "src/app/api/marketplace/supplier-logo/[supplierId]/route.ts",
);

if (!schema.includes("marketplaceLogoPathname")) {
  failures.push("Supplier marketplace logo schema field is missing.");
}

if (!query.includes("hasLogo")) {
  failures.push("Marketplace query does not expose supplier logo state.");
}

if (!catalog.includes("SupplierMarketplaceLogoUpload")) {
  failures.push("Seller catalog does not expose business logo management.");
}

if (!directory.includes("vendor.hasLogo")) {
  failures.push("Vendor directory does not display supplier logos.");
}

if (!upload.includes("Upload business logo")) {
  failures.push("Supplier logo upload component is incomplete.");
}

if (
  !register.includes(
    "marketplace.supplier.logo.upload",
  ) ||
  !register.includes(
    "marketplace.supplier.logo.replace",
  )
) {
  failures.push("Supplier logo changes are not audited.");
}

if (
  !register.includes(
    "isTenantSelfProfile: true",
  )
) {
  failures.push("Supplier logo registration is not tenant-self scoped.");
}

if (
  !serve.includes(
    "getMarketplaceImage",
  )
) {
  failures.push("Private supplier logo serving route is incomplete.");
}

if (failures.length) {
  console.error("B13.10.15 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.15 supplier business logo marketplace profile validation passed.",
);

#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const editPage =
  "src/app/app/marketplace/catalog/[id]/edit/page.tsx";

if (!fs.existsSync(editPage)) {
  failures.push("Dedicated seller edit page is missing.");
}

const actions = read(
  "src/modules/marketplace-catalog/actions.ts",
);
const queries = read(
  "src/modules/marketplace-catalog/queries.ts",
);
const catalog = read(
  "src/app/app/marketplace/catalog/page.tsx",
);

if (
  !actions.includes(
    "updateMarketplaceOfferingDetailsAction",
  )
) {
  failures.push("Full offering update action is missing.");
}

if (
  !actions.includes(
    "supplier_marketplace.offering.update",
  )
) {
  failures.push("Offering edits are not audited.");
}

if (
  !queries.includes(
    "getMarketplaceOfferingForEdit",
  )
) {
  failures.push(
    "Tenant-scoped offering edit query is missing.",
  );
}

if (!catalog.includes("Edit offering")) {
  failures.push(
    "Catalog management workspace has no Edit offering control.",
  );
}

if (
  actions.includes(
    "supplierMarketplaceOffering.updateMany({\n      where: {\n        id: offeringId,\n        tenantId: user.tenantId,\n      },\n      data: {\n        offeringType:"
  )
) {
  failures.push(
    "Full offering update should use a verified tenant-owned record, not a blind bulk update.",
  );
}

if (failures.length) {
  console.error("B13.10.10 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.10 seller marketplace offering edit validation passed.",
);

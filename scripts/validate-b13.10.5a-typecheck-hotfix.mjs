#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const notifications = fs.readFileSync(
  "src/core/marketplace-commerce/notifications.ts",
  "utf8",
);
const actions = fs.readFileSync(
  "src/modules/marketplace-commerce/actions.ts",
  "utf8",
);
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

if (!notifications.includes('PlatformRole[]')) {
  failures.push("Seller notification roles are not typed as PlatformRole[].");
}
if (notifications.includes('"CRITICAL"')) {
  failures.push("Marketplace notification helper still exposes CRITICAL priority.");
}
if (actions.includes("supplier: true")) {
  failures.push("Marketplace checkout still assumes a Supplier relation include.");
}
if (actions.includes("offering.supplier.")) {
  failures.push("Marketplace checkout still reads an unsupported offering.supplier relation.");
}
if (actions.includes("offering.media[")) {
  failures.push("Marketplace checkout still reads an unsupported offering.media relation.");
}
if (!actions.includes("supplierMap.get(offering.supplierId)")) {
  failures.push("Marketplace checkout supplier lookup map is missing.");
}
if (!actions.includes("mediaByOffering.get(offering.id)")) {
  failures.push("Marketplace checkout media lookup map is missing.");
}
if (!schema.includes('map: "MktPRLineBinding_tenant_request_idx"')) {
  failures.push("Marketplace PR binding tenant/request index map is missing.");
}
if (!schema.includes('map: "MktPRLineBinding_seller_created_idx"')) {
  failures.push("Marketplace PR binding seller index map is missing.");
}
if (!schema.includes('map: "MktOfferingMedia_tenant_offer_pos_idx"')) {
  failures.push("Marketplace offering media index map is missing.");
}

if (failures.length) {
  console.error("B13.10.5a validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("B13.10.5a validation passed.");

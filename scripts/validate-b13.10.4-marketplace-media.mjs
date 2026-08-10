#!/usr/bin/env node
import fs from "node:fs";
const required = [
  "src/modules/marketplace-catalog/media.ts",
  "src/app/api/marketplace/catalog/media/[id]/route.ts",
  "prisma/migrations/20260810233000_marketplace_offering_media/migration.sql",
];
const missing = required.filter((file) => !fs.existsSync(file));
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
if (!schema.includes("model SupplierMarketplaceOfferingMedia")) missing.push("SupplierMarketplaceOfferingMedia model");
const page = fs.readFileSync("src/app/app/marketplace/catalog/page.tsx", "utf8");
if (!page.includes('name="images"') || !page.includes("Make primary")) missing.push("marketplace image controls");
if (missing.length) { console.error("B13.10.4 validation failed:"); missing.forEach((item) => console.error(`- ${item}`)); process.exit(1); }
console.log("B13.10.4 marketplace media validation passed.");

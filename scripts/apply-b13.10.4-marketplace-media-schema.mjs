#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("model SupplierMarketplaceOfferingMedia")) {
  schema += `

model SupplierMarketplaceOfferingMedia {
  id               String   @id @default(cuid())
  tenantId         String
  offeringId       String
  pathname         String
  contentType      String
  sizeBytes        Int
  altText          String?
  position         Int      @default(0)
  isPrimary        Boolean  @default(false)
  uploadedByUserId String?
  createdAt        DateTime @default(now())
  offering         SupplierMarketplaceOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)

  @@index([tenantId, offeringId, position])
  @@index([offeringId, isPrimary])
}
`;
  console.log("Added SupplierMarketplaceOfferingMedia model.");
}

const start = schema.indexOf("model SupplierMarketplaceOffering {");
if (start < 0) throw new Error("SupplierMarketplaceOffering model was not found.");
const end = schema.indexOf("\n}", start);
const block = schema.slice(start, end + 2);
if (!block.includes("media")) {
  const updated = block.replace(/\n}$/, "\n  media              SupplierMarketplaceOfferingMedia[]\n}");
  schema = schema.slice(0, start) + updated + schema.slice(end + 2);
  console.log("Added SupplierMarketplaceOffering.media relation.");
}

fs.writeFileSync(schemaPath, schema);
console.log("B13.10.4 marketplace media schema complete.");

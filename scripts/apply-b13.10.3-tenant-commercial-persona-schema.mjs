#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("enum TenantCommercialPersona {")) {
  const anchor = "model Tenant {";
  if (!source.includes(anchor)) throw new Error("Could not locate Tenant model.");

  source = source.replace(
    anchor,
    `enum TenantCommercialPersona {
  BUYER
  SUPPLIER
  BUYER_SUPPLIER
}

${anchor}`,
  );
  console.log("Added TenantCommercialPersona enum.");
}

if (!source.includes("commercialPersona                           TenantCommercialPersona")) {
  const anchor =
    "  status                                      TenantStatus                                 @default(PROVISIONING)";
  if (!source.includes(anchor)) {
    throw new Error("Could not locate Tenant.status schema anchor.");
  }

  source = source.replace(
    anchor,
    `${anchor}
  commercialPersona                           TenantCommercialPersona                      @default(BUYER)`,
  );
  console.log("Added Tenant.commercialPersona.");
}

if (!source.includes("@@index([commercialPersona])")) {
  const start = source.indexOf("model Tenant {");
  const end = source.indexOf("\n}", start);
  if (start === -1 || end === -1) throw new Error("Could not locate Tenant model boundary.");

  const block = source.slice(start, end + 2);
  const updated = block.replace(
    "  @@index([countryCode])",
    `  @@index([countryCode])
  @@index([commercialPersona])`,
  );

  source = source.slice(0, start) + updated + source.slice(end + 2);
  console.log("Added Tenant commercial persona index.");
}

fs.writeFileSync(path, source);
console.log("B13.10.3 tenant commercial persona schema complete.");

#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("marketplaceLogoPathname")) {
  source = source.replace(
    `  primaryPhone             String?
  categories               String[]`,
    `  primaryPhone             String?
  marketplaceLogoPathname  String?
  marketplaceLogoContentType String?
  marketplaceLogoUpdatedAt DateTime?
  categories               String[]`,
  );
}

fs.writeFileSync(path, source);
console.log("Added Supplier marketplace logo fields.");
console.log("B13.10.15 supplier logo schema integration complete.");

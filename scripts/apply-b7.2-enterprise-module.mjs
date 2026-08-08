#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Supplier Marketplace Discovery",`;

const entry = `  {
    title: "Marketplace Product Catalog",
    description:
      "Publish and discover supplier products and services with pricing, availability, category and regional metadata.",
    href: "/app/marketplace/catalog",
    icon: PackageSearch,
    group: "Suppliers",
  },

`;

if (source.includes('href: "/app/marketplace/catalog"')) {
  console.log("Marketplace Product Catalog already registered.");
  process.exit(0);
}

if (!source.includes("  PackageSearch,\n")) {
  throw new Error(
    "PackageSearch icon import is missing from Enterprise Modules.",
  );
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Supplier Marketplace Discovery module.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Marketplace Product Catalog under Suppliers.");

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Marketplace Product Catalog",`;

const entry = `  {
    title: "Verified Supplier Network & Ratings",
    description:
      "Govern supplier verification evidence, marketplace ratings, trust scores, suspension and reinstatement.",
    href: "/app/marketplace/trust",
    icon: BadgeCheck,
    group: "Suppliers",
  },

`;

if (source.includes('href: "/app/marketplace/trust"')) {
  console.log("Verified Supplier Network & Ratings already registered.");
  process.exit(0);
}

if (!source.includes("  BadgeCheck,\n")) {
  throw new Error(
    "BadgeCheck icon import is missing from Enterprise Modules.",
  );
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Marketplace Product Catalog module.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Verified Supplier Network & Ratings under Suppliers.");

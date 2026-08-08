#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

if (!source.includes("  PackageSearch,\n")) {
  const insertionPoints = [
    "  PackageCheck,\n",
    "  PackageX,\n",
    "  Store,\n",
  ];

  const point = insertionPoints.find((candidate) =>
    source.includes(candidate),
  );

  if (!point) {
    throw new Error(
      "Could not locate a stable Lucide import insertion point for PackageSearch.",
    );
  }

  source = source.replace(
    point,
    `${point}  PackageSearch,\n`,
  );

  console.log("Added PackageSearch icon import.");
} else {
  console.log("PackageSearch icon import already present.");
}

if (!source.includes('href: "/app/marketplace/catalog"')) {
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

  if (!source.includes(marker)) {
    throw new Error(
      "Could not locate Supplier Marketplace Discovery module anchor.",
    );
  }

  source = source.replace(marker, `${entry}${marker}`);
  console.log("Registered Marketplace Product Catalog under Suppliers.");
} else {
  console.log("Marketplace Product Catalog already registered.");
}

fs.writeFileSync(file, source);

console.log("B7.2 Enterprise Modules registration repair complete.");

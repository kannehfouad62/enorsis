#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Supplier Management",`;

const entry = `  {
    title: "Supplier Marketplace Discovery",
    description:
      "Global supplier discovery, marketplace visibility, verification, industries, categories and capability search.",
    href: "/app/marketplace/suppliers",
    icon: Store,
    group: "Suppliers",
  },
`;

if (source.includes('href: "/app/marketplace/suppliers"')) {
  console.log("Supplier Marketplace Discovery is already registered.");
  process.exit(0);
}

if (!source.includes("  Store,\n")) {
  const candidates = [
    "  Search,\n",
    "  ShoppingCart,\n",
    "  PackageSearch,\n",
  ];

  const point = candidates.find((candidate) =>
    source.includes(candidate),
  );

  if (!point) {
    throw new Error(
      "Could not find stable Lucide import insertion point.",
    );
  }

  source = source.replace(
    point,
    `${point}  Store,\n`,
  );
}

if (!source.includes(marker)) {
  throw new Error("Could not locate Supplier Management module.");
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Supplier Marketplace Discovery under Suppliers.");

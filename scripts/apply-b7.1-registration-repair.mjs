#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const enterpriseFile = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);
const registryFile = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let enterprise = fs.readFileSync(enterpriseFile, "utf8");
let registry = fs.readFileSync(registryFile, "utf8");

const moduleHref = "/app/marketplace/suppliers";

if (!enterprise.includes(`href: "${moduleHref}"`)) {
  const marker = `  {
    title: "Supplier Directory",`;

  const entry = `  {
    title: "Supplier Marketplace Discovery",
    description:
      "Global supplier discovery, marketplace visibility, verification, industries, categories and capability search.",
    href: "/app/marketplace/suppliers",
    icon: Store,
    group: "Suppliers",
  },

`;

  if (!enterprise.includes(marker)) {
    throw new Error(
      "Could not locate current Supplier Directory module anchor.",
    );
  }

  enterprise = enterprise.replace(marker, `${entry}${marker}`);
  console.log("Registered Supplier Marketplace Discovery under Suppliers.");
} else {
  console.log("Supplier Marketplace Discovery already registered.");
}

if (!registry.includes(`"${moduleHref}"`)) {
  const marker =
    '  "/app/suppliers": { id: "supplier-directory", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },';

  const replacement =
    `${marker}\n  "/app/marketplace/suppliers": { id: "supplier-marketplace-discovery", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },`;

  if (!registry.includes(marker)) {
    throw new Error(
      "Could not locate current Supplier Directory registry metadata.",
    );
  }

  registry = registry.replace(marker, replacement);
  console.log("Registered Supplier Marketplace Discovery metadata.");
} else {
  console.log("Supplier Marketplace Discovery metadata already registered.");
}

fs.writeFileSync(enterpriseFile, enterprise);
fs.writeFileSync(registryFile, registry);

console.log("B7.1 marketplace registration repair complete.");

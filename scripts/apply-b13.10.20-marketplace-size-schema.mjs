#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

function injectIntoModel(modelName, anchorPattern, insertion) {
  const modelStart = source.indexOf(`model ${modelName} {`);
  if (modelStart === -1) {
    throw new Error(`Prisma model ${modelName} was not found.`);
  }

  const modelEnd = source.indexOf("\n}", modelStart);
  if (modelEnd === -1) {
    throw new Error(`Prisma model ${modelName} is malformed.`);
  }

  const block = source.slice(modelStart, modelEnd);

  if (block.includes(insertion.trim())) {
    return;
  }

  const match = block.match(anchorPattern);
  if (!match) {
    throw new Error(
      `Could not find schema anchor inside ${modelName}.`,
    );
  }

  const absolute =
    modelStart + match.index + match[0].length;

  source =
    source.slice(0, absolute) +
    `\n${insertion}` +
    source.slice(absolute);
}

injectIntoModel(
  "SupplierMarketplaceOffering",
  /\n\s*availabilityStatus\s+\w+[^\n]*/,
  `  availableSizes          String[]  @default([])`,
);

injectIntoModel(
  "MarketplacePurchaseRequestLineBinding",
  /\n\s*offeringName\s+String[^\n]*/,
  `  selectedSize            String?`,
);

fs.writeFileSync(path, source);

console.log("Added SupplierMarketplaceOffering.availableSizes.");
console.log("Added MarketplacePurchaseRequestLineBinding.selectedSize.");
console.log("B13.10.20 marketplace size schema integration complete.");

#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

if (source.includes("isTenantSelfProfile")) {
  console.log("Supplier.isTenantSelfProfile already exists.");
  process.exit(0);
}

const start = source.indexOf("model Supplier {");
const end = source.indexOf("\n}", start);

if (start === -1 || end === -1) {
  throw new Error("Could not locate Supplier model.");
}

let block = source.slice(start, end + 2);

const updatedAt = block.indexOf("  updatedAt");
if (updatedAt === -1) {
  throw new Error("Could not locate Supplier.updatedAt.");
}

const lineEnd = block.indexOf("\n", updatedAt);

block =
  block.slice(0, lineEnd + 1) +
  "  isTenantSelfProfile Boolean                     @default(false)\n" +
  block.slice(lineEnd + 1);

block = block.replace(
  "\n}",
  "\n  @@index([tenantId, isTenantSelfProfile])\n}",
);

source =
  source.slice(0, start) +
  block +
  source.slice(end + 2);

fs.writeFileSync(path, source);

console.log("Added Supplier.isTenantSelfProfile.");
console.log("Added tenant/self-profile lookup index.");
console.log("B13.10.4C supplier self-identity schema complete.");

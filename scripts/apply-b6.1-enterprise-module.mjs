#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);
let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Supplier Compliance",`;

const entry = `  {
    title: "Supplier Collaboration Operations",
    description:
      "Supplier invoice submissions, shipment updates and persistent buyer–supplier conversations.",
    href: "/app/supplier-portal/collaboration",
    icon: MessagesSquare,
    group: "Suppliers",
  },
`;

if (source.includes('href: "/app/supplier-portal/collaboration"')) {
  console.log("Supplier Collaboration Operations is already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error("Could not locate Supplier Compliance module entry.");
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Supplier Collaboration Operations under Suppliers.");

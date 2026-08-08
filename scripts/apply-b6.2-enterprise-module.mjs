#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Supplier Collaboration Operations",`;

const entry = `  {
    title: "Supplier Self-Service Access",
    description:
      "Issue secure supplier portal access for invoice, shipment, task and conversation self-service.",
    href: "/app/supplier-portal/access",
    icon: KeyRound,
    group: "Suppliers",
  },
`;

if (source.includes('href: "/app/supplier-portal/access"')) {
  console.log("Supplier Self-Service Access is already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Supplier Collaboration Operations module.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Supplier Self-Service Access under Suppliers.");

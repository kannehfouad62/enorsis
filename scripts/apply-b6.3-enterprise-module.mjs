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
    title: "Supplier Documents & Action Requests",
    description:
      "Govern shared document exchange, supplier acknowledgements, structured requests and supplier responses.",
    href: "/app/supplier-portal/collaboration/requests",
    icon: ListChecks,
    group: "Suppliers",
  },
`;

if (source.includes('href: "/app/supplier-portal/collaboration/requests"')) {
  console.log("Supplier Documents & Action Requests already registered.");
  process.exit(0);
}

if (!source.includes("  ListChecks,\n")) {
  source = source.replace(
    "  MessagesSquare,\n",
    "  MessagesSquare,\n  ListChecks,\n",
  );
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Supplier Collaboration Operations module.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Supplier Documents & Action Requests under Suppliers.");

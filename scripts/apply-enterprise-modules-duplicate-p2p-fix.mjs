#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const duplicateBlock = `  {
    title: "Requisition-to-Order",
    description: "Requisition, approval, order, receipt and exception journey.",
    href: "/app/requisition-to-order",
    icon: ShoppingCart,
    group: "Procurement",
  },

`;

if (!source.includes(duplicateBlock)) {
  console.log(
    "Duplicate Requisition-to-Order module entry is already absent.",
  );
  process.exit(0);
}

source = source.replace(duplicateBlock, "");
fs.writeFileSync(file, source);

console.log(
  "Removed duplicate Requisition-to-Order Enterprise Module card.",
);
console.log(
  "Procure to Pay remains the canonical top-level /app/requisition-to-order module.",
);

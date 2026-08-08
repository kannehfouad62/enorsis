#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Unified Procurement AI",`;

const entry = `  {
    title: "Specialized AI Assistants",
    description:
      "Role-aware Procurement, Supplier, Inventory, Contract and Executive assistants grounded in Enterprise RAG.",
    href: "/app/ai/assistants",
    icon: MessagesSquare,
    group: "Intelligence",
  },
`;

if (source.includes('href: "/app/ai/assistants"')) {
  console.log("Specialized AI Assistants is already registered.");
  process.exit(0);
}

if (!source.includes("  MessagesSquare,\n")) {
  const insertionPoints = [
    "  Network,\n",
    "  PackageCheck,\n",
    "  FileText,\n",
  ];

  const point = insertionPoints.find((item) =>
    source.includes(item),
  );

  if (!point) {
    throw new Error(
      "Could not find a stable Lucide import insertion point.",
    );
  }

  source = source.replace(
    point,
    `${point}  MessagesSquare,\n`,
  );
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Unified Procurement AI Enterprise Modules entry.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Specialized AI Assistants under Intelligence.");

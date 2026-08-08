#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Verified Supplier Network & Ratings",`;

const entry = `  {
    title: "AI Supplier Matching",
    description:
      "Explainable supplier ranking using capabilities, geography, trust, performance, risk and catalog evidence with governed AI analysis.",
    href: "/app/marketplace/matching",
    icon: Bot,
    group: "Suppliers",
  },

`;

if (source.includes('href: "/app/marketplace/matching"')) {
  console.log("AI Supplier Matching already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Verified Supplier Network & Ratings module.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered AI Supplier Matching under Suppliers.");

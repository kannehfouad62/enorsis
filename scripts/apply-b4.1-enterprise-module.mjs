#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const oldText = `  {
    title: "AI Procurement",
    description: "Governed procurement AI capabilities, analysis and human review.",
    href: "/app/agents",
    icon: Bot,
    group: "Intelligence",
  },`;

const newText = `  {
    title: "Unified Procurement AI",
    description:
      "Tenant-grounded procurement intelligence across contracts, suppliers, policies and procedures.",
    href: "/app/ai/workspace",
    icon: Bot,
    group: "Intelligence",
  },`;

if (source.includes(newText)) {
  console.log("Enterprise Modules already points to Unified Procurement AI.");
} else if (source.includes(oldText)) {
  source = source.replace(oldText, newText);
  fs.writeFileSync(file, source);
  console.log("Updated Enterprise Modules: Unified Procurement AI.");
} else {
  throw new Error(
    "Could not locate the current AI Procurement Enterprise Modules entry.",
  );
}

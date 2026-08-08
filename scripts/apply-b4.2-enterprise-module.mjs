#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "AI Automation Copilot",`;

const entry = `  {
    title: "Enterprise Knowledge & RAG",
    description:
      "Govern tenant knowledge sources, embeddings and semantic retrieval for Enorsis AI.",
    href: "/app/ai/knowledge",
    icon: BookOpenCheck,
    group: "Intelligence",
  },
`;

if (source.includes('href: "/app/ai/knowledge"')) {
  console.log("Enterprise Knowledge & RAG is already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate AI Automation Copilot Enterprise Modules entry.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Enterprise Knowledge & RAG under Intelligence.");

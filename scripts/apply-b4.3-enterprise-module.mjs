#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Enterprise Knowledge & RAG",`;

const entry = `  {
    title: "RAG Document Ingestion",
    description:
      "Extract and index tenant-private supplier and contract documents for governed semantic retrieval.",
    href: "/app/ai/knowledge/documents",
    icon: FileSearch,
    group: "Intelligence",
  },
`;

if (source.includes('href: "/app/ai/knowledge/documents"')) {
  console.log("RAG Document Ingestion is already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Enterprise Knowledge & RAG Enterprise Modules entry.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered RAG Document Ingestion under Intelligence.");

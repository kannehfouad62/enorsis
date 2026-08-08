#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "RAG Document Ingestion",`;

const entry = `  {
    title: "Governed OCR Ingestion",
    description:
      "Extract scanned PDF and image document text through governed AI and index it into Enterprise RAG.",
    href: "/app/ai/knowledge/ocr",
    icon: FileScan,
    group: "Intelligence",
  },
`;

if (source.includes('href: "/app/ai/knowledge/ocr"')) {
  console.log("Governed OCR Ingestion is already registered.");
  process.exit(0);
}

if (!source.includes("  FileScan,\n")) {
  source = source.replace(
    "  FileSearch,\n",
    "  FileSearch,\n  FileScan,\n",
  );
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate RAG Document Ingestion Enterprise Modules entry.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Governed OCR Ingestion under Intelligence.");

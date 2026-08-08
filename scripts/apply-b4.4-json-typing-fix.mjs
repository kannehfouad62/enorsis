#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/ai/rag/ocr-ingestion.ts",
);

let source = fs.readFileSync(file, "utf8");

if (!source.includes('import { Prisma } from "@/generated/prisma";')) {
  source = source.replace(
    'import { extractTextWithGovernedOcr } from "@/core/ai/rag/ocr";\n',
    'import { extractTextWithGovernedOcr } from "@/core/ai/rag/ocr";\nimport { Prisma } from "@/generated/prisma";\n',
  );
}

source = source.replace(
  '  metadata: Record<string, unknown>;\n',
  '  metadata: Prisma.InputJsonObject;\n',
);

fs.writeFileSync(file, source);
console.log("Fixed B4.4 Prisma JSON metadata typing.");

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/ai/rag/ocr-ingestion.ts",
);

let source = fs.readFileSync(file, "utf8");

source = source.replace(
  'import { Prisma } from "@/generated/prisma";\n',
  "",
);

source = source.replace(
  "  metadata: Prisma.InputJsonObject;\n",
  "  metadata: Record<string, string | number | boolean | null>;\n",
);

fs.writeFileSync(file, source);
console.log("Fixed B4.4 JSON metadata typing without generated Prisma import.");

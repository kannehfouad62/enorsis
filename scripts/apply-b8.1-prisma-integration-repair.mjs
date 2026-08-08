#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/predictive-procurement/forecast-engine.ts",
);

let source = fs.readFileSync(file, "utf8");

const prismaImport = 'import { Prisma } from "@/generated/prisma/client";\n';
const clientImport = 'import { prisma } from "@/lib/prisma";\n';

if (!source.includes(prismaImport)) {
  if (!source.includes(clientImport)) {
    throw new Error(
      "Could not locate Prisma client import in predictive forecast engine.",
    );
  }

  source = source.replace(
    clientImport,
    `${prismaImport}${clientImport}`,
  );

  console.log("Added generated Prisma namespace import.");
} else {
  console.log("Generated Prisma namespace import already present.");
}

const oldType = "    evidence: Record<string, unknown>;\n";
const newType = "    evidence: Prisma.InputJsonValue;\n";

if (source.includes(oldType)) {
  source = source.replace(oldType, newType);
  console.log("Aligned forecast evidence with Prisma InputJsonValue.");
} else if (source.includes(newType)) {
  console.log("Forecast evidence is already Prisma JSON typed.");
} else {
  throw new Error(
    "Could not locate forecast signal evidence type declaration.",
  );
}

fs.writeFileSync(file, source);
console.log("B8.1 Prisma JSON typing repair complete.");

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const orchestratorFile = path.join(
  process.cwd(),
  "src/core/autonomous-procurement/orchestrator.ts",
);

const modulesFile = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let orchestrator = fs.readFileSync(orchestratorFile, "utf8");
let modules = fs.readFileSync(modulesFile, "utf8");

if (!orchestrator.includes('import { Prisma } from "@/generated/prisma/client";')) {
  const prismaImportAnchor = 'import { prisma } from "@/lib/prisma";';
  if (!orchestrator.includes(prismaImportAnchor)) {
    throw new Error("Could not locate prisma import anchor in orchestrator.");
  }

  orchestrator = orchestrator.replace(
    prismaImportAnchor,
    `import { Prisma } from "@/generated/prisma/client";\n${prismaImportAnchor}`,
  );
}

const oldEvidence = '      evidence: input.evidence ?? {},';
const newEvidence =
  '      evidence: (input.evidence ?? {}) as Prisma.InputJsonValue,';

if (orchestrator.includes(oldEvidence)) {
  orchestrator = orchestrator.replace(oldEvidence, newEvidence);
} else if (!orchestrator.includes(newEvidence)) {
  throw new Error("Could not locate orchestration event evidence assignment.");
}

const oldGroupUnion =
  '    | "Intelligence";';
const newGroupUnion =
  '    | "Intelligence"\n    | "Automation";';

if (modules.includes(oldGroupUnion)) {
  modules = modules.replace(oldGroupUnion, newGroupUnion);
} else if (!modules.includes('| "Automation";')) {
  throw new Error("Could not locate EnterpriseModuleLink group union.");
}

fs.writeFileSync(orchestratorFile, orchestrator);
fs.writeFileSync(modulesFile, modules);

console.log("Aligned B11.1 orchestration evidence with Prisma InputJsonValue.");
console.log("Added Automation as a first-class Enterprise Module group.");
console.log("B11.1 integration repair complete.");

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

/* -------------------------------------------------------------------------- */
/* Prisma JSON typing                                                         */
/* -------------------------------------------------------------------------- */

const prismaNamespaceImport =
  'import { Prisma } from "@/generated/prisma/client";';

if (!orchestrator.includes(prismaNamespaceImport)) {
  const prismaImportAnchor =
    'import { prisma } from "@/lib/prisma";';

  if (!orchestrator.includes(prismaImportAnchor)) {
    throw new Error(
      "Could not locate the Prisma client import in orchestrator.ts.",
    );
  }

  orchestrator = orchestrator.replace(
    prismaImportAnchor,
    `${prismaNamespaceImport}\n${prismaImportAnchor}`,
  );
}

const oldEvidence =
  '      evidence: input.evidence ?? {},';

const newEvidence =
  '      evidence: (input.evidence ?? {}) as Prisma.InputJsonValue,';

if (orchestrator.includes(oldEvidence)) {
  orchestrator = orchestrator.replace(
    oldEvidence,
    newEvidence,
  );
} else if (!orchestrator.includes(newEvidence)) {
  throw new Error(
    "Could not locate the orchestration evidence assignment.",
  );
}

/* -------------------------------------------------------------------------- */
/* Enterprise Module group typing                                             */
/* -------------------------------------------------------------------------- */

if (!modules.includes('"Automation"')) {
  const interfaceMatch = modules.match(
    /export\s+type\s+EnterpriseModuleLink\s*=\s*\{[\s\S]*?\n\};|type\s+EnterpriseModuleLink\s*=\s*\{[\s\S]*?\n\};|export\s+interface\s+EnterpriseModuleLink\s*\{[\s\S]*?\n\}|interface\s+EnterpriseModuleLink\s*\{[\s\S]*?\n\}/,
  );

  if (!interfaceMatch) {
    throw new Error(
      "Could not locate the EnterpriseModuleLink declaration.",
    );
  }

  const declaration = interfaceMatch[0];

  const groupMatch = declaration.match(
    /group\s*:\s*([\s\S]*?);/,
  );

  if (!groupMatch) {
    throw new Error(
      "Could not locate EnterpriseModuleLink.group type.",
    );
  }

  const currentGroupType = groupMatch[1];

  if (!currentGroupType.includes('"Automation"')) {
    const expandedGroupType =
      `${currentGroupType.trimEnd()}\n    | "Automation"`;

    const updatedDeclaration = declaration.replace(
      groupMatch[0],
      `group: ${expandedGroupType};`,
    );

    modules = modules.replace(
      declaration,
      updatedDeclaration,
    );
  }
}

/* Confirm the new module entry is compatible. */
if (
  modules.includes(
    'group: "Automation"',
  ) &&
  !modules.match(
    /group\s*:[\s\S]*?"Automation"[\s\S]*?;/,
  )
) {
  throw new Error(
    "Automation module entry exists but the group type was not successfully expanded.",
  );
}

fs.writeFileSync(orchestratorFile, orchestrator);
fs.writeFileSync(modulesFile, modules);

console.log(
  "Aligned B11.1 orchestration evidence with Prisma InputJsonValue.",
);
console.log(
  "Added Automation as a first-class Enterprise Module group.",
);
console.log(
  "B11.1 integration repair v2 complete.",
);

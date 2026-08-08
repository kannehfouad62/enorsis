#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enterprisePath = path.join(
  root,
  "src/modules/navigation/enterprise-modules.ts",
);
const registryPath = path.join(
  root,
  "src/core/modules/registry.ts",
);

const enterpriseSource = fs.readFileSync(enterprisePath, "utf8");
const registrySource = fs.readFileSync(registryPath, "utf8");

const registeredHrefs = new Set(
  [...enterpriseSource.matchAll(/href:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  ),
);

const metadataBlock =
  registrySource.match(
    /const metadataByHref:[\s\S]*?=\s*\{([\s\S]*?)\n\};/,
  )?.[1] ?? "";

const metadataHrefs = [
  ...metadataBlock.matchAll(/^\s*"([^"]+)":/gm),
].map((match) => match[1]);

const stale = metadataHrefs.filter(
  (href) => !registeredHrefs.has(href),
);

const requiredB4 = [
  "/app/ai/workspace",
  "/app/ai/assistants",
  "/app/ai/knowledge",
  "/app/ai/knowledge/documents",
  "/app/ai/knowledge/ocr",
  "/app/automation/copilot",
  "/app/analytics/process-mining",
];

const missingB4 = requiredB4.filter(
  (href) => !registeredHrefs.has(href),
);

if (stale.length > 0 || missingB4.length > 0) {
  console.error("Enterprise Modules registry consistency failed.");

  for (const href of stale) {
    console.error(`  stale metadata: ${href}`);
  }

  for (const href of missingB4) {
    console.error(`  missing B4 module: ${href}`);
  }

  process.exit(1);
}

console.log(
  `Enterprise Modules registry consistency passed (${registeredHrefs.size} module links).`,
);

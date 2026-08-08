#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

// 1. Replace stale Procure-to-Pay metadata key.
source = source.replace(
  '  "/app/procure-to-pay": { id: "procure-to-pay", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },',
  '  "/app/requisition-to-order": { id: "procure-to-pay", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },',
);

// 2. Replace stale AI metadata with current B4 workspaces.
source = source.replace(
`  "/app/ai": {
    id: "ai-procurement",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },`,
`  "/app/ai/workspace": {
    id: "unified-procurement-ai",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/assistants": {
    id: "specialized-ai-assistants",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge": {
    id: "enterprise-knowledge-rag",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge/documents": {
    id: "rag-document-ingestion",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge/ocr": {
    id: "governed-ocr-ingestion",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/copilot": {
    id: "ai-automation-copilot",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/process-mining": {
    id: "enterprise-process-mining",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },`,
);

// 3. Platform operators must bypass tenant-role filtering.
const oldDecision = `    moduleRegistry.map(async (module) => {
      if (!module.active) return null;
      if (!hasAnyRole(userRoles, module.roles)) return null;
      if (isPlatformOperator) return module;
      if (!module.featureKey) return module;`;

const newDecision = `    moduleRegistry.map(async (module) => {
      if (!module.active) return null;
      if (isPlatformOperator) return module;
      if (!hasAnyRole(userRoles, module.roles)) return null;
      if (!module.featureKey) return module;`;

if (source.includes(oldDecision)) {
  source = source.replace(oldDecision, newDecision);
} else if (!source.includes(newDecision)) {
  throw new Error(
    "Could not locate getAccessibleModules decision block.",
  );
}

fs.writeFileSync(file, source);
console.log("Synchronized module access registry with current Enterprise Modules.");
console.log("Platform operators now receive all active Enterprise Modules.");

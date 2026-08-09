#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const files = {
  inventory: path.join(
    process.cwd(),
    "src/core/predictive-inventory/optimization-engine.ts",
  ),
  capacity: path.join(
    process.cwd(),
    "src/core/predictive-capacity/capacity-engine.ts",
  ),
};

let inventory = fs.readFileSync(files.inventory, "utf8");
let capacity = fs.readFileSync(files.capacity, "utf8");

const importLine =
  'import { evaluateMultiEngineControlledConfidence, MULTI_ENGINE_DECISION_PATHS } from "@/core/ai-runtime/multi-engine-adoption";';

/* -------------------------------------------------------------------------- */
/* Predictive Inventory                                                       */
/* -------------------------------------------------------------------------- */

if (!inventory.includes(importLine)) {
  const anchor = 'import { prisma } from "@/lib/prisma";';

  if (!inventory.includes(anchor)) {
    throw new Error(
      "Could not locate Predictive Inventory Prisma import anchor.",
    );
  }

  inventory = inventory.replace(
    anchor,
    `${anchor}\n${importLine}`,
  );
}

const inventoryOld = `  if (signals.length > 0) await prisma.predictiveInventoryOptimizationSignal.createMany({ data: signals });
  return { run, signalCount: signals.length };
}`;

const inventoryNew = `  const runtimeAcceptedSignals: typeof signals = [];

  for (const signal of signals) {
    const decision =
      await evaluateMultiEngineControlledConfidence({
        tenantId: input.tenantId,
        decisionPath:
          MULTI_ENGINE_DECISION_PATHS.PREDICTIVE_INVENTORY,
        confidence: signal.confidence,
        actorUserId: input.createdByUserId,
        correlationId: run.id,
        extraEvidence: {
          optimizationRunId: run.id,
          inventoryItemId: signal.inventoryItemId,
          sku: signal.sku,
          itemName: signal.itemName,
          category: signal.category,
          riskLevel: signal.riskLevel,
          recommendation: signal.recommendation,
        },
      });

    if (decision.effectiveAllowed) {
      runtimeAcceptedSignals.push(signal);
    }
  }

  if (runtimeAcceptedSignals.length > 0) {
    await prisma.predictiveInventoryOptimizationSignal.createMany({
      data: runtimeAcceptedSignals,
    });
  }

  return {
    run,
    signalCount: runtimeAcceptedSignals.length,
    candidateSignalCount: signals.length,
    suppressedSignalCount:
      signals.length - runtimeAcceptedSignals.length,
  };
}`;

if (inventory.includes(inventoryOld)) {
  inventory = inventory.replace(
    inventoryOld,
    inventoryNew,
  );
} else if (!inventory.includes(inventoryNew)) {
  throw new Error(
    "Could not locate Predictive Inventory signal persistence block.",
  );
}

/* -------------------------------------------------------------------------- */
/* Predictive Capacity                                                        */
/* -------------------------------------------------------------------------- */

if (!capacity.includes(importLine)) {
  const anchor = 'import { prisma } from "@/lib/prisma";';

  if (!capacity.includes(anchor)) {
    throw new Error(
      "Could not locate Predictive Capacity Prisma import anchor.",
    );
  }

  capacity = capacity.replace(
    anchor,
    `${anchor}\n${importLine}`,
  );
}

const capacityOld = `  if (signals.length > 0) {
    await prisma.predictiveCapacityPlanningSignal.createMany({
      data: signals,
    });
  }

  return {
    run,
    signalCount: signals.length,
  };
}`;

const capacityNew = `  const runtimeAcceptedSignals: typeof signals = [];

  for (const signal of signals) {
    const decision =
      await evaluateMultiEngineControlledConfidence({
        tenantId: input.tenantId,
        decisionPath:
          MULTI_ENGINE_DECISION_PATHS.PREDICTIVE_CAPACITY,
        confidence: signal.confidence,
        actorUserId: input.createdByUserId,
        correlationId: run.id,
        extraEvidence: {
          capacityRunId: run.id,
          scopeType: signal.scopeType,
          scopeKey: signal.scopeKey,
          scopeLabel: signal.scopeLabel,
          riskLevel: signal.riskLevel,
          recommendation: signal.recommendation,
        },
      });

    if (decision.effectiveAllowed) {
      runtimeAcceptedSignals.push(signal);
    }
  }

  if (runtimeAcceptedSignals.length > 0) {
    await prisma.predictiveCapacityPlanningSignal.createMany({
      data: runtimeAcceptedSignals,
    });
  }

  return {
    run,
    signalCount: runtimeAcceptedSignals.length,
    candidateSignalCount: signals.length,
    suppressedSignalCount:
      signals.length - runtimeAcceptedSignals.length,
  };
}`;

if (capacity.includes(capacityOld)) {
  capacity = capacity.replace(
    capacityOld,
    capacityNew,
  );
} else if (!capacity.includes(capacityNew)) {
  throw new Error(
    "Could not locate Predictive Capacity signal persistence block.",
  );
}

fs.writeFileSync(files.inventory, inventory);
fs.writeFileSync(files.capacity, capacity);

console.log(
  "Integrated Predictive Inventory with B13.3 controlled runtime adoption.",
);
console.log(
  "Integrated Predictive Capacity with B13.3 controlled runtime adoption.",
);
console.log(
  "OFF and SHADOW preserve legacy signal persistence; ENFORCED may suppress governed candidates.",
);
console.log(
  "B13.3 inventory/capacity runtime integration complete.",
);

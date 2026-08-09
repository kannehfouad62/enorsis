#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const adoptionFile = path.join(
  process.cwd(),
  "src/core/closed-loop-procurement/runtime-adoption.ts",
);

const forecastFile = path.join(
  process.cwd(),
  "src/core/predictive-procurement/forecast-engine.ts",
);

let adoption = fs.readFileSync(adoptionFile, "utf8");
let forecast = fs.readFileSync(forecastFile, "utf8");

/* -------------------------------------------------------------------------- */
/* 1. Preserve legacy behavior in OFF and SHADOW                              */
/* -------------------------------------------------------------------------- */

const oldEffectiveDecision = `  const effectiveAllowed =
    adoption.mode === "ENFORCED"
      ? governedAllowed
      : defaultAllowed;`;

const newEffectiveDecision = `  // Predictive procurement historically persisted every generated signal.
  // OFF and SHADOW therefore MUST preserve that behavior exactly.
  // Only ENFORCED mode may allow the governed confidence gate to suppress
  // a signal.
  const effectiveAllowed =
    adoption.mode === "ENFORCED"
      ? governedAllowed
      : true;`;

if (adoption.includes(oldEffectiveDecision)) {
  adoption = adoption.replace(
    oldEffectiveDecision,
    newEffectiveDecision,
  );
} else if (!adoption.includes(newEffectiveDecision)) {
  throw new Error(
    "Could not locate B12.8 effective runtime adoption decision block.",
  );
}

const oldRationale = `      rationale:
        \`Controlled runtime adoption mode=\${adoption.mode}; defaultAllowed=\${defaultAllowed}; governedAllowed=\${governedAllowed}.\`,`;

const newRationale = `      rationale:
        \`Controlled runtime adoption mode=\${adoption.mode}; legacySignalAllowed=true; defaultThresholdComparison=\${defaultAllowed}; governedAllowed=\${governedAllowed}; effectiveAllowed=\${effectiveAllowed}.\`,`;

if (adoption.includes(oldRationale)) {
  adoption = adoption.replace(
    oldRationale,
    newRationale,
  );
} else if (!adoption.includes(newRationale)) {
  throw new Error(
    "Could not locate B12.8 runtime trace rationale block.",
  );
}

const oldEvidence = `        defaultAllowed,
        governedAllowed,
        shadowDifferent,`;

const newEvidence = `        legacySignalAllowed: true,
        defaultAllowed,
        governedAllowed,
        effectiveAllowed,
        shadowDifferent,`;

if (adoption.includes(oldEvidence)) {
  adoption = adoption.replace(
    oldEvidence,
    newEvidence,
  );
} else if (!adoption.includes(newEvidence)) {
  throw new Error(
    "Could not locate B12.8 runtime trace evidence block.",
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Wire predictive procurement signals through controlled adoption          */
/* -------------------------------------------------------------------------- */

const forecastImport =
  'import { evaluateControlledRuntimeConfidence } from "@/core/closed-loop-procurement/runtime-adoption";';

if (!forecast.includes(forecastImport)) {
  const importAnchor =
    'import { prisma } from "@/lib/prisma";';

  if (!forecast.includes(importAnchor)) {
    throw new Error(
      "Could not locate predictive procurement Prisma import anchor.",
    );
  }

  forecast = forecast.replace(
    importAnchor,
    `${importAnchor}\n${forecastImport}`,
  );
}

const oldPersistence = `  if (signals.length > 0) {
    await prisma.predictiveProcurementForecastSignal.createMany({
      data: signals,
    });
  }

  return {
    run,
    signalCount: signals.length,
  };`;

const newPersistence = `  // B12.8 controlled runtime adoption.
  //
  // OFF     -> preserve every generated signal (legacy behavior).
  // SHADOW  -> preserve every generated signal, but trace how the governed
  //            confidence policy would differ.
  // ENFORCED -> only persist signals allowed by the governed confidence gate.
  //
  // Each candidate signal is evaluated independently so B12.7 receives a
  // trace correlated to the forecast run and signal scope.
  const runtimeAcceptedSignals: typeof signals = [];

  for (const signal of signals) {
    const decision =
      await evaluateControlledRuntimeConfidence({
        tenantId: input.tenantId,
        confidence: signal.confidence,
        actorUserId: input.createdByUserId,
        correlationId: run.id,
        extraEvidence: {
          forecastRunId: run.id,
          signalType: signal.signalType,
          scopeKey: signal.scopeKey,
          scopeLabel: signal.scopeLabel,
          riskLevel: signal.riskLevel,
        },
      });

    if (decision.effectiveAllowed) {
      runtimeAcceptedSignals.push(signal);
    }
  }

  if (runtimeAcceptedSignals.length > 0) {
    await prisma.predictiveProcurementForecastSignal.createMany({
      data: runtimeAcceptedSignals,
    });
  }

  return {
    run,
    signalCount: runtimeAcceptedSignals.length,
    candidateSignalCount: signals.length,
    suppressedSignalCount:
      signals.length - runtimeAcceptedSignals.length,
  };`;

if (forecast.includes(oldPersistence)) {
  forecast = forecast.replace(
    oldPersistence,
    newPersistence,
  );
} else if (!forecast.includes(newPersistence)) {
  throw new Error(
    "Could not locate predictive procurement signal persistence block.",
  );
}

fs.writeFileSync(adoptionFile, adoption);
fs.writeFileSync(forecastFile, forecast);

console.log(
  "Corrected B12.8 OFF/SHADOW semantics to preserve legacy signal behavior.",
);
console.log(
  "Integrated predictive procurement signals with controlled runtime confidence adoption.",
);
console.log(
  "B12.8 predictive procurement runtime integration complete.",
);

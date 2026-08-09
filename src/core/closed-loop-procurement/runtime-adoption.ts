import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolveConfidenceThreshold,
} from "@/core/closed-loop-procurement/runtime-policy";
import {
  recordRuntimePolicyDecisionTrace,
} from "@/core/closed-loop-procurement/runtime-trace";

export type ControlledRuntimeDecision = {
  decisionPath: string;
  mode: "OFF" | "SHADOW" | "ENFORCED";
  confidence: number;
  defaultThreshold: number;
  governedThreshold: number;
  defaultAllowed: boolean;
  governedAllowed: boolean;
  effectiveAllowed: boolean;
  policySource: string;
  policyId: string | null;
  policyVersion: number | null;
  traceId: string;
  shadowDifferent: boolean;
};

const ALLOWED_MODES = new Set([
  "OFF",
  "SHADOW",
  "ENFORCED",
]);

const ALLOWED_DECISION_PATHS = new Set([
  "PREDICTIVE_PROCUREMENT_CONFIDENCE",
]);

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function ensurePredictiveProcurementAdoption(
  tenantId: string,
) {
  const existing =
    await prisma.closedLoopRuntimePolicyAdoption.findFirst({
      where: {
        tenantId,
        decisionPath:
          "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      },
    });

  if (existing) return existing;

  return prisma.closedLoopRuntimePolicyAdoption.create({
    data: {
      tenantId,
      decisionPath:
        "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      policyType: "CONFIDENCE_THRESHOLD",
      scopeStrategy: "CONFIDENCE_BUCKET",
      mode: "OFF",
      defaultThreshold: 70,
      minimumValue: 0,
      maximumValue: 100,
      status: "ACTIVE",
      rationale:
        "Predictive procurement runtime adoption starts OFF and must be explicitly advanced through SHADOW before ENFORCED mode.",
    },
  });
}

export async function updateRuntimePolicyAdoption(input: {
  tenantId: string;
  userId: string;
  decisionPath: string;
  mode: "OFF" | "SHADOW" | "ENFORCED";
  rationale: string | null;
}) {
  if (!ALLOWED_DECISION_PATHS.has(input.decisionPath)) {
    throw new Error(
      "Decision path is not allowlisted for controlled runtime adoption.",
    );
  }

  if (!ALLOWED_MODES.has(input.mode)) {
    throw new Error(
      "Runtime adoption mode must be OFF, SHADOW or ENFORCED.",
    );
  }

  const adoption =
    await ensurePredictiveProcurementAdoption(
      input.tenantId,
    );

  if (
    adoption.mode === "OFF" &&
    input.mode === "ENFORCED"
  ) {
    throw new Error(
      "Runtime adoption cannot move directly from OFF to ENFORCED. Use SHADOW first.",
    );
  }

  const updated =
    await prisma.closedLoopRuntimePolicyAdoption.update({
      where: { id: adoption.id },
      data: {
        mode: input.mode,
        updatedByUserId: input.userId,
        activatedByUserId:
          input.mode === "ENFORCED"
            ? input.userId
            : adoption.activatedByUserId,
        activatedAt:
          input.mode === "ENFORCED"
            ? new Date()
            : adoption.activatedAt,
        rationale:
          input.rationale ??
          adoption.rationale,
      },
    });

  await prisma.closedLoopRuntimePolicyAdoptionEvent.create({
    data: {
      tenantId: input.tenantId,
      adoptionId: adoption.id,
      eventType: "ADOPTION_MODE_CHANGED",
      actorUserId: input.userId,
      fromMode: adoption.mode,
      toMode: input.mode,
      message:
        input.rationale ??
        `Runtime adoption changed from ${adoption.mode} to ${input.mode}.`,
      snapshot: json({
        decisionPath: adoption.decisionPath,
        policyType: adoption.policyType,
        priorMode: adoption.mode,
        newMode: input.mode,
        defaultThreshold:
          adoption.defaultThreshold,
      }),
    },
  });

  return updated;
}

export async function evaluateControlledRuntimeConfidence(input: {
  tenantId: string;
  confidence: number;
  actorUserId?: string | null;
  correlationId?: string | null;
  extraEvidence?: unknown;
}): Promise<ControlledRuntimeDecision> {
  const adoption =
    await ensurePredictiveProcurementAdoption(
      input.tenantId,
    );

  const resolution =
    await resolveConfidenceThreshold({
      tenantId: input.tenantId,
      confidence: input.confidence,
      defaultThreshold:
        adoption.defaultThreshold,
    });

  const defaultAllowed =
    input.confidence >=
    adoption.defaultThreshold;

  const governedAllowed =
    input.confidence >=
    resolution.boundedValue;

  const shadowDifferent =
    defaultAllowed !== governedAllowed;

  // Predictive procurement historically persisted every generated signal.
  // OFF and SHADOW therefore MUST preserve that behavior exactly.
  // Only ENFORCED mode may allow the governed confidence gate to suppress
  // a signal.
  const effectiveAllowed =
    adoption.mode === "ENFORCED"
      ? governedAllowed
      : true;

  const trace =
    await recordRuntimePolicyDecisionTrace({
      tenantId: input.tenantId,
      decisionType:
        "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      resolution,
      inputValue: input.confidence,
      decisionResult: effectiveAllowed,
      actorUserId:
        input.actorUserId ?? null,
      correlationId:
        input.correlationId ?? null,
      rationale:
        `Controlled runtime adoption mode=${adoption.mode}; legacySignalAllowed=true; defaultThresholdComparison=${defaultAllowed}; governedAllowed=${governedAllowed}; effectiveAllowed=${effectiveAllowed}.`,
      extraEvidence: {
        adoptionId: adoption.id,
        adoptionMode: adoption.mode,
        legacySignalAllowed: true,
        defaultAllowed,
        governedAllowed,
        effectiveAllowed,
        shadowDifferent,
        ...(input.extraEvidence === undefined
          ? {}
          : {
              callerEvidence:
                input.extraEvidence,
            }),
      },
    });

  await prisma.closedLoopRuntimePolicyAdoption.update({
    where: { id: adoption.id },
    data: {
      lastDecisionAt: new Date(),
      decisionCount: {
        increment: 1,
      },
      shadowDifferenceCount:
        shadowDifferent
          ? {
              increment: 1,
            }
          : undefined,
    },
  });

  return {
    decisionPath: adoption.decisionPath,
    mode: adoption.mode as
      | "OFF"
      | "SHADOW"
      | "ENFORCED",
    confidence: input.confidence,
    defaultThreshold:
      adoption.defaultThreshold,
    governedThreshold:
      resolution.boundedValue,
    defaultAllowed,
    governedAllowed,
    effectiveAllowed,
    policySource: resolution.source,
    policyId: resolution.policyId,
    policyVersion: resolution.version,
    traceId: trace.id,
    shadowDifferent,
  };
}

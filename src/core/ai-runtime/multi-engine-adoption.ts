import { prisma } from "@/lib/prisma";
import {
  resolveConfidenceThreshold,
} from "@/core/closed-loop-procurement/runtime-policy";
import {
  recordRuntimePolicyDecisionTrace,
} from "@/core/closed-loop-procurement/runtime-trace";

export const MULTI_ENGINE_DECISION_PATHS = {
  PREDICTIVE_PROCUREMENT:
    "PREDICTIVE_PROCUREMENT_CONFIDENCE",
  PREDICTIVE_INVENTORY:
    "PREDICTIVE_INVENTORY_CONFIDENCE",
  PREDICTIVE_CAPACITY:
    "PREDICTIVE_CAPACITY_CONFIDENCE",
} as const;

export type MultiEngineDecisionPath =
  (typeof MULTI_ENGINE_DECISION_PATHS)[keyof typeof MULTI_ENGINE_DECISION_PATHS];

const ENGINE_CONFIG: Record<
  MultiEngineDecisionPath,
  {
    label: string;
    defaultThreshold: number;
    policyType: string;
    scopeStrategy: string;
  }
> = {
  PREDICTIVE_PROCUREMENT_CONFIDENCE: {
    label: "Predictive Procurement",
    defaultThreshold: 70,
    policyType: "CONFIDENCE_THRESHOLD",
    scopeStrategy: "CONFIDENCE_BUCKET",
  },
  PREDICTIVE_INVENTORY_CONFIDENCE: {
    label: "Predictive Inventory Optimization",
    defaultThreshold: 70,
    policyType: "CONFIDENCE_THRESHOLD",
    scopeStrategy: "CONFIDENCE_BUCKET",
  },
  PREDICTIVE_CAPACITY_CONFIDENCE: {
    label: "Predictive Capacity Planning",
    defaultThreshold: 70,
    policyType: "CONFIDENCE_THRESHOLD",
    scopeStrategy: "CONFIDENCE_BUCKET",
  },
};

function assertDecisionPath(
  value: string,
): asserts value is MultiEngineDecisionPath {
  if (!(value in ENGINE_CONFIG)) {
    throw new Error(
      "Decision path is not allowlisted for multi-engine controlled adoption.",
    );
  }
}

export async function ensureMultiEngineRuntimeAdoption(
  tenantId: string,
  decisionPath: MultiEngineDecisionPath,
) {
  const config = ENGINE_CONFIG[decisionPath];

  const existing =
    await prisma.closedLoopRuntimePolicyAdoption.findFirst({
      where: {
        tenantId,
        decisionPath,
      },
    });

  if (existing) return existing;

  return prisma.closedLoopRuntimePolicyAdoption.create({
    data: {
      tenantId,
      decisionPath,
      policyType: config.policyType,
      scopeStrategy: config.scopeStrategy,
      mode: "OFF",
      defaultThreshold:
        config.defaultThreshold,
      minimumValue: 0,
      maximumValue: 100,
      status: "ACTIVE",
      rationale:
        `${config.label} controlled runtime adoption starts OFF and must pass through SHADOW before ENFORCED.`,
    },
  });
}

export async function ensureAllMultiEngineAdoptions(
  tenantId: string,
) {
  return Promise.all(
    Object.keys(
      ENGINE_CONFIG,
    ).map((decisionPath) =>
      ensureMultiEngineRuntimeAdoption(
        tenantId,
        decisionPath as MultiEngineDecisionPath,
      ),
    ),
  );
}

export async function updateMultiEngineRuntimeAdoption(
  input: {
    tenantId: string;
    userId: string;
    decisionPath: string;
    mode: "OFF" | "SHADOW" | "ENFORCED";
    rationale?: string | null;
  },
) {
  assertDecisionPath(input.decisionPath);

  const adoption =
    await ensureMultiEngineRuntimeAdoption(
      input.tenantId,
      input.decisionPath,
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
      eventType:
        "MULTI_ENGINE_ADOPTION_MODE_CHANGED",
      actorUserId: input.userId,
      fromMode: adoption.mode,
      toMode: input.mode,
      message:
        input.rationale ??
        `${input.decisionPath} changed from ${adoption.mode} to ${input.mode}.`,
      snapshot: {
        decisionPath:
          input.decisionPath,
        priorMode: adoption.mode,
        newMode: input.mode,
        defaultThreshold:
          adoption.defaultThreshold,
      },
    },
  });

  return updated;
}

export async function evaluateMultiEngineControlledConfidence(
  input: {
    tenantId: string;
    decisionPath: MultiEngineDecisionPath;
    confidence: number;
    actorUserId?: string | null;
    correlationId?: string | null;
    extraEvidence?: unknown;
  },
) {
  const adoption =
    await ensureMultiEngineRuntimeAdoption(
      input.tenantId,
      input.decisionPath,
    );

  const resolution =
    await resolveConfidenceThreshold({
      tenantId: input.tenantId,
      confidence: input.confidence,
      defaultThreshold:
        adoption.defaultThreshold,
    });

  const legacyAllowed = true;

  const defaultAllowed =
    input.confidence >=
    adoption.defaultThreshold;

  const governedAllowed =
    input.confidence >=
    resolution.boundedValue;

  const shadowDifferent =
    defaultAllowed !== governedAllowed;

  const effectiveAllowed =
    adoption.mode === "ENFORCED"
      ? governedAllowed
      : legacyAllowed;

  const trace =
    await recordRuntimePolicyDecisionTrace({
      tenantId: input.tenantId,
      decisionType:
        input.decisionPath,
      resolution,
      inputValue: input.confidence,
      decisionResult:
        effectiveAllowed,
      actorUserId:
        input.actorUserId ?? null,
      correlationId:
        input.correlationId ?? null,
      rationale:
        `B13.3 multi-engine adoption mode=${adoption.mode}; legacyAllowed=${legacyAllowed}; defaultAllowed=${defaultAllowed}; governedAllowed=${governedAllowed}; effectiveAllowed=${effectiveAllowed}.`,
      extraEvidence: {
        decisionPath:
          input.decisionPath,
        adoptionId: adoption.id,
        adoptionMode: adoption.mode,
        legacyAllowed,
        defaultAllowed,
        governedAllowed,
        effectiveAllowed,
        shadowDifferent,
        callerEvidence:
          input.extraEvidence ?? null,
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
          ? { increment: 1 }
          : undefined,
    },
  });

  return {
    decisionPath:
      input.decisionPath,
    mode: adoption.mode as
      | "OFF"
      | "SHADOW"
      | "ENFORCED",
    confidence:
      input.confidence,
    defaultThreshold:
      adoption.defaultThreshold,
    governedThreshold:
      resolution.boundedValue,
    legacyAllowed,
    defaultAllowed,
    governedAllowed,
    effectiveAllowed,
    shadowDifferent,
    policySource:
      resolution.source,
    policyId:
      resolution.policyId,
    policyVersion:
      resolution.version,
    traceId: trace.id,
  };
}

export function getMultiEngineRuntimeCatalog() {
  return Object.entries(
    ENGINE_CONFIG,
  ).map(([decisionPath, config]) => ({
    decisionPath:
      decisionPath as MultiEngineDecisionPath,
    ...config,
  }));
}

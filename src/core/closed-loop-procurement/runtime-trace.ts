import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createRuntimePolicyEvidence,
  resolveConfidenceThreshold,
  type RuntimeLearningPolicyResolution,
} from "@/core/closed-loop-procurement/runtime-policy";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordRuntimePolicyDecisionTrace(input: {
  tenantId: string;
  decisionType: string;
  resolution: RuntimeLearningPolicyResolution;
  inputValue?: number | null;
  decisionResult?: boolean | null;
  actorUserId?: string | null;
  correlationId?: string | null;
  rationale?: string | null;
  extraEvidence?: unknown;
}) {
  const policyEvidence =
    await createRuntimePolicyEvidence(input.resolution);

  return prisma.closedLoopRuntimePolicyDecisionTrace.create({
    data: {
      tenantId: input.tenantId,
      decisionType: input.decisionType,
      scopeKey: input.resolution.scopeKey,
      policyType: input.resolution.policyType,
      policyKey: input.resolution.policyKey,
      policyId: input.resolution.policyId,
      proposalId: input.resolution.proposalId,
      policyVersion: input.resolution.version,
      policySource: input.resolution.source,
      requestedDefault:
        input.resolution.requestedDefault,
      effectiveValue:
        input.resolution.effectiveValue,
      boundedValue:
        input.resolution.boundedValue,
      wasClamped: input.resolution.wasClamped,
      inputValue: input.inputValue ?? null,
      decisionResult:
        input.decisionResult ?? null,
      rationale:
        input.rationale ??
        input.resolution.rationale,
      actorUserId: input.actorUserId ?? null,
      correlationId:
        input.correlationId ?? null,
      evidence: json({
        policy: policyEvidence,
        extraEvidence:
          input.extraEvidence ?? null,
        tracedAt: new Date().toISOString(),
      }),
    },
  });
}

export async function evaluateGovernedConfidenceGateWithTrace(input: {
  tenantId: string;
  confidence: number;
  defaultThreshold: number;
  actorUserId?: string | null;
  correlationId?: string | null;
  rationale?: string | null;
  extraEvidence?: unknown;
}) {
  const resolution =
    await resolveConfidenceThreshold({
      tenantId: input.tenantId,
      confidence: input.confidence,
      defaultThreshold:
        input.defaultThreshold,
    });

  const allowed =
    input.confidence >=
    resolution.boundedValue;

  const trace =
    await recordRuntimePolicyDecisionTrace({
      tenantId: input.tenantId,
      decisionType: "CONFIDENCE_GATE",
      resolution,
      inputValue: input.confidence,
      decisionResult: allowed,
      actorUserId:
        input.actorUserId ?? null,
      correlationId:
        input.correlationId ?? null,
      rationale:
        input.rationale ?? null,
      extraEvidence:
        input.extraEvidence,
    });

  return {
    allowed,
    confidence: input.confidence,
    threshold:
      resolution.boundedValue,
    policySource:
      resolution.source,
    policyId:
      resolution.policyId,
    policyVersion:
      resolution.version,
    traceId: trace.id,
    evidence:
      await createRuntimePolicyEvidence(
        resolution,
      ),
  };
}

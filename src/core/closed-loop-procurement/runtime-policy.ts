import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type RuntimeLearningPolicyResolution = {
  policyKey: string;
  policyType: string;
  scopeKey: string;
  scopeLabel: string;
  version: number | null;
  source: "ACTIVE_POLICY" | "DEFAULT";
  requestedDefault: number;
  effectiveValue: number;
  boundedValue: number;
  wasClamped: boolean;
  policyId: string | null;
  proposalId: string | null;
  rationale: string | null;
};

const SUPPORTED_RUNTIME_POLICY_TYPES = new Set([
  "CONFIDENCE_THRESHOLD",
]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function finite(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function resolveRuntimeLearningPolicy(input: {
  tenantId: string;
  policyType: string;
  scopeKey: string;
  defaultValue: number;
  minimum?: number;
  maximum?: number;
}): Promise<RuntimeLearningPolicyResolution> {
  const minimum = input.minimum ?? 0;
  const maximum = input.maximum ?? 100;

  if (minimum > maximum) {
    throw new Error(
      "Runtime learning policy minimum cannot exceed maximum.",
    );
  }

  const policyKey = `${input.policyType}:${input.scopeKey}`;
  const boundedDefault = clamp(
    input.defaultValue,
    minimum,
    maximum,
  );

  if (!SUPPORTED_RUNTIME_POLICY_TYPES.has(input.policyType)) {
    return {
      policyKey,
      policyType: input.policyType,
      scopeKey: input.scopeKey,
      scopeLabel: input.scopeKey,
      version: null,
      source: "DEFAULT",
      requestedDefault: input.defaultValue,
      effectiveValue: input.defaultValue,
      boundedValue: boundedDefault,
      wasClamped: boundedDefault !== input.defaultValue,
      policyId: null,
      proposalId: null,
      rationale:
        "Policy type is not allowlisted for runtime consumption.",
    };
  }

  const active =
    await prisma.closedLoopLearningPolicy.findFirst({
      where: {
        tenantId: input.tenantId,
        policyKey,
        status: "ACTIVE",
      },
      orderBy: { version: "desc" },
    });

  if (!active) {
    return {
      policyKey,
      policyType: input.policyType,
      scopeKey: input.scopeKey,
      scopeLabel: input.scopeKey,
      version: null,
      source: "DEFAULT",
      requestedDefault: input.defaultValue,
      effectiveValue: input.defaultValue,
      boundedValue: boundedDefault,
      wasClamped: boundedDefault !== input.defaultValue,
      policyId: null,
      proposalId: null,
      rationale:
        "No ACTIVE governed learning policy exists for this scope.",
    };
  }

  const configured =
    finite(active.effectiveValue) ??
    finite(active.proposedValue) ??
    finite(active.currentValue);

  if (configured === null) {
    return {
      policyKey,
      policyType: active.policyType,
      scopeKey: active.scopeKey,
      scopeLabel: active.scopeLabel,
      version: active.version,
      source: "DEFAULT",
      requestedDefault: input.defaultValue,
      effectiveValue: input.defaultValue,
      boundedValue: boundedDefault,
      wasClamped: boundedDefault !== input.defaultValue,
      policyId: active.id,
      proposalId: active.proposalId,
      rationale:
        "ACTIVE policy contained no finite numeric value; runtime default preserved.",
    };
  }

  const boundedValue = clamp(
    configured,
    minimum,
    maximum,
  );

  return {
    policyKey,
    policyType: active.policyType,
    scopeKey: active.scopeKey,
    scopeLabel: active.scopeLabel,
    version: active.version,
    source: "ACTIVE_POLICY",
    requestedDefault: input.defaultValue,
    effectiveValue: configured,
    boundedValue,
    wasClamped: boundedValue !== configured,
    policyId: active.id,
    proposalId: active.proposalId,
    rationale: active.rationale,
  };
}

export async function resolveConfidenceThreshold(input: {
  tenantId: string;
  confidence: number;
  defaultThreshold: number;
}) {
  const bucket =
    input.confidence < 20
      ? "0–20"
      : input.confidence < 40
        ? "20–40"
        : input.confidence < 60
          ? "40–60"
          : input.confidence < 80
            ? "60–80"
            : "80–100";

  return resolveRuntimeLearningPolicy({
    tenantId: input.tenantId,
    policyType: "CONFIDENCE_THRESHOLD",
    scopeKey: `CONFIDENCE_BUCKET:${bucket}`,
    defaultValue: input.defaultThreshold,
    minimum: 0,
    maximum: 100,
  });
}

export async function createRuntimePolicyEvidence(
  resolution: RuntimeLearningPolicyResolution,
) {
  return json({
    policyKey: resolution.policyKey,
    policyType: resolution.policyType,
    scopeKey: resolution.scopeKey,
    scopeLabel: resolution.scopeLabel,
    policyId: resolution.policyId,
    proposalId: resolution.proposalId,
    version: resolution.version,
    source: resolution.source,
    requestedDefault: resolution.requestedDefault,
    effectiveValue: resolution.effectiveValue,
    boundedValue: resolution.boundedValue,
    wasClamped: resolution.wasClamped,
    resolvedAt: new Date().toISOString(),
  });
}

export async function resolveRuntimeLearningPolicySnapshot(input: {
  tenantId: string;
  confidence?: number;
  defaultConfidenceThreshold?: number;
}) {
  const confidence = clamp(
    input.confidence ?? 75,
    0,
    100,
  );

  const confidenceThreshold =
    await resolveConfidenceThreshold({
      tenantId: input.tenantId,
      confidence,
      defaultThreshold:
        input.defaultConfidenceThreshold ?? 70,
    });

  return {
    confidence,
    confidenceThreshold,
    supportedPolicyTypes: Array.from(
      SUPPORTED_RUNTIME_POLICY_TYPES,
    ),
    guardrails: {
      confidenceMinimum: 0,
      confidenceMaximum: 100,
      unsupportedPolicyTypesFallBack: true,
      inactivePoliciesIgnored: true,
      missingValuesFallBack: true,
      rollbackImmediate:
        "The resolver reads only the current ACTIVE version on every resolution; rolling back a policy changes the next resolution without code deployment.",
    },
  };
}

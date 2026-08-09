import {
  createRuntimePolicyEvidence,
  resolveConfidenceThreshold,
} from "@/core/closed-loop-procurement/runtime-policy";

export async function evaluateGovernedConfidenceGate(input: {
  tenantId: string;
  confidence: number;
  defaultThreshold: number;
}) {
  const resolution =
    await resolveConfidenceThreshold({
      tenantId: input.tenantId,
      confidence: input.confidence,
      defaultThreshold: input.defaultThreshold,
    });

  return {
    allowed:
      input.confidence >=
      resolution.boundedValue,
    confidence: input.confidence,
    threshold: resolution.boundedValue,
    policySource: resolution.source,
    policyId: resolution.policyId,
    policyVersion: resolution.version,
    evidence:
      await createRuntimePolicyEvidence(
        resolution,
      ),
  };
}

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensurePredictiveProcurementAdoption,
} from "@/core/closed-loop-procurement/runtime-adoption";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function pct(numerator: number, denominator: number) {
  return denominator === 0
    ? 0
    : (numerator / denominator) * 100;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export async function calculateAiRuntimeHealth(
  tenantId: string,
) {
  const [
    traces,
    activePolicies,
    latestCertification,
    adoption,
  ] = await Promise.all([
    prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        policyKey: true,
        policyType: true,
        version: true,
        effectiveValue: true,
      },
    }),
    prisma.aiRuntimeCertificationRun.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    ensurePredictiveProcurementAdoption(tenantId),
  ]);

  const total = traces.length;
  const activePolicyTraces = traces.filter(
    (trace) => trace.policySource === "ACTIVE_POLICY",
  );
  const fallbackTraces = traces.filter(
    (trace) => trace.policySource === "DEFAULT",
  );
  const deniedTraces = traces.filter(
    (trace) => trace.decisionResult === false,
  );
  const clampedTraces = traces.filter(
    (trace) => trace.wasClamped,
  );

  const brokenActive = traces.filter(
    (trace) =>
      trace.policySource === "ACTIVE_POLICY" &&
      (!trace.policyId || trace.policyVersion === null),
  );

  const brokenDefault = traces.filter(
    (trace) =>
      trace.policySource === "DEFAULT" &&
      (trace.policyId !== null ||
        trace.policyVersion !== null),
  );

  const invalidBounds = traces.filter(
    (trace) =>
      !Number.isFinite(trace.boundedValue) ||
      trace.boundedValue < 0 ||
      trace.boundedValue > 100,
  );

  const brokenTraceCount =
    brokenActive.length +
    brokenDefault.length +
    invalidBounds.length;

  const activePolicyRate = pct(
    activePolicyTraces.length,
    total,
  );
  const fallbackRate = pct(
    fallbackTraces.length,
    total,
  );
  const deniedRate = pct(
    deniedTraces.length,
    total,
  );
  const clampedRate = pct(
    clampedTraces.length,
    total,
  );
  const traceIntegrityRate =
    total === 0
      ? 100
      : clamp(
          100 -
            pct(brokenTraceCount, total),
        );

  const runtimeSupportedPolicies =
    activePolicies.filter(
      (policy) =>
        policy.policyType ===
        "CONFIDENCE_THRESHOLD",
    );

  const advisoryPolicies =
    activePolicies.filter(
      (policy) =>
        policy.policyType !==
        "CONFIDENCE_THRESHOLD",
    );

  const anomalies: Array<{
    key: string;
    severity: "WARN" | "FAIL";
    message: string;
  }> = [];

  if (fallbackRate > 25 && total >= 20) {
    anomalies.push({
      key: "HIGH_FALLBACK_RATE",
      severity: "WARN",
      message: `Fallback rate is ${fallbackRate.toFixed(1)}%, above the 25% monitoring threshold.`,
    });
  }

  if (clampedRate > 0) {
    anomalies.push({
      key: "CLAMPED_POLICY_VALUES",
      severity: "FAIL",
      message: `${clampedTraces.length} runtime decision(s) required policy clamping.`,
    });
  }

  if (traceIntegrityRate < 100) {
    anomalies.push({
      key: "TRACE_INTEGRITY_GAP",
      severity: "FAIL",
      message: `Trace integrity is ${traceIntegrityRate.toFixed(1)}%.`,
    });
  }

  if (
    adoption.mode === "ENFORCED" &&
    latestCertification?.status !== "PASSED"
  ) {
    anomalies.push({
      key: "ENFORCED_WITHOUT_CLEAN_CERTIFICATION",
      severity: "FAIL",
      message:
        "Runtime adoption is ENFORCED but latest AI runtime certification is not PASSED.",
    });
  }

  if (
    adoption.mode === "ENFORCED" &&
    runtimeSupportedPolicies.length === 0
  ) {
    anomalies.push({
      key: "ENFORCED_WITHOUT_RUNTIME_POLICY",
      severity: "FAIL",
      message:
        "Runtime adoption is ENFORCED but no ACTIVE confidence-threshold policy exists.",
    });
  }

  if (!latestCertification) {
    anomalies.push({
      key: "CERTIFICATION_MISSING",
      severity: "WARN",
      message:
        "No B13.1 AI runtime certification run exists.",
    });
  }

  const failCount = anomalies.filter(
    (item) => item.severity === "FAIL",
  ).length;

  const warnCount = anomalies.filter(
    (item) => item.severity === "WARN",
  ).length;

  const certificationScore =
    latestCertification?.certificationScore ?? 0;

  const score = clamp(
    100 -
      failCount * 20 -
      warnCount * 8 -
      Math.min(20, fallbackRate * 0.2) -
      Math.min(15, deniedRate * 0.1) -
      Math.min(20, clampedRate) -
      (100 - traceIntegrityRate) * 0.5 +
      Math.min(10, certificationScore * 0.1),
  );

  const status =
    failCount > 0
      ? "DEGRADED"
      : warnCount > 0
        ? "WATCH"
        : "HEALTHY";

  return {
    status,
    healthScore: score,
    metrics: {
      decisionCount: total,
      activePolicyRate,
      fallbackRate,
      deniedRate,
      clampedRate,
      traceIntegrityRate,
      activePolicyCount:
        runtimeSupportedPolicies.length,
      advisoryPolicyCount:
        advisoryPolicies.length,
      certificationStatus:
        latestCertification?.status ?? null,
      certificationScore:
        latestCertification?.certificationScore ??
        null,
      adoptionMode: adoption.mode,
    },
    anomalies,
  };
}

export async function captureAiRuntimeHealthSnapshot(
  tenantId: string,
) {
  const health =
    await calculateAiRuntimeHealth(tenantId);

  return prisma.aiRuntimeHealthSnapshot.create({
    data: {
      tenantId,
      status: health.status,
      healthScore: health.healthScore,
      decisionCount:
        health.metrics.decisionCount,
      activePolicyRate:
        health.metrics.activePolicyRate,
      fallbackRate:
        health.metrics.fallbackRate,
      deniedRate:
        health.metrics.deniedRate,
      clampedRate:
        health.metrics.clampedRate,
      traceIntegrityRate:
        health.metrics.traceIntegrityRate,
      activePolicyCount:
        health.metrics.activePolicyCount,
      advisoryPolicyCount:
        health.metrics.advisoryPolicyCount,
      certificationStatus:
        health.metrics.certificationStatus,
      certificationScore:
        health.metrics.certificationScore,
      adoptionMode:
        health.metrics.adoptionMode,
      anomalyCount:
        health.anomalies.length,
      metrics: json(health.metrics),
      anomalies: json(health.anomalies),
    },
  });
}

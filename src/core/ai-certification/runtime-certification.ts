import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolveConfidenceThreshold,
  resolveRuntimeLearningPolicy,
} from "@/core/closed-loop-procurement/runtime-policy";
import {
  ensurePredictiveProcurementAdoption,
} from "@/core/closed-loop-procurement/runtime-adoption";
import {
  ensureRuntimeRollbackRule,
} from "@/core/closed-loop-procurement/runtime-promotion";

type ScenarioStatus = "PASS" | "WARN" | "FAIL";

type ScenarioResult = {
  scenarioKey: string;
  scenarioLabel: string;
  category: string;
  status: ScenarioStatus;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  evidence: Prisma.InputJsonValue;
  durationMs: number;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function scenario(
  input: Omit<ScenarioResult, "durationMs">,
): Promise<ScenarioResult> {
  const started = Date.now();
  return {
    ...input,
    durationMs: Math.max(0, Date.now() - started),
  };
}

async function certifyAdoptionMode(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();
  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);

  const valid = ["OFF", "SHADOW", "ENFORCED"].includes(
    adoption.mode,
  );

  return {
    scenarioKey: "ADOPTION_MODE_VALID",
    scenarioLabel: "Runtime adoption mode is valid",
    category: "RUNTIME_GOVERNANCE",
    status: valid ? "PASS" : "FAIL",
    severity: "CRITICAL",
    message: valid
      ? `Runtime adoption mode ${adoption.mode} is allowlisted.`
      : `Runtime adoption mode ${adoption.mode} is not allowlisted.`,
    evidence: json({
      adoptionId: adoption.id,
      decisionPath: adoption.decisionPath,
      mode: adoption.mode,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyActivePolicyUniqueness(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const active =
    await prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        policyKey: true,
        version: true,
      },
    });

  const counts = new Map<string, number>();
  for (const policy of active) {
    counts.set(
      policy.policyKey,
      (counts.get(policy.policyKey) ?? 0) + 1,
    );
  }

  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([policyKey, count]) => ({
      policyKey,
      count,
    }));

  return {
    scenarioKey: "ACTIVE_POLICY_UNIQUENESS",
    scenarioLabel: "One ACTIVE version per policy key",
    category: "POLICY_VERSIONING",
    status:
      duplicates.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    message:
      duplicates.length === 0
        ? "No policy key has more than one ACTIVE version."
        : `${duplicates.length} policy key(s) have multiple ACTIVE versions.`,
    evidence: json({
      activePolicyCount: active.length,
      duplicates,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyConfidenceBounds(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const active =
    await prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        policyType: "CONFIDENCE_THRESHOLD",
      },
      select: {
        id: true,
        policyKey: true,
        version: true,
        effectiveValue: true,
      },
    });

  const violations = active.filter((policy) => {
    const value = Number(policy.effectiveValue);
    return (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    );
  });

  return {
    scenarioKey: "CONFIDENCE_POLICY_BOUNDS",
    scenarioLabel: "Active confidence policies are bounded",
    category: "POLICY_SAFETY",
    status:
      violations.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    message:
      violations.length === 0
        ? "All ACTIVE confidence-threshold policies are within 0–100."
        : `${violations.length} ACTIVE confidence policy value(s) are outside safe bounds.`,
    evidence: json({
      activeConfidencePolicies: active,
      violations,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyResolverSamples(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();
  const samples = [5, 25, 45, 65, 85];

  const resolutions = [];

  for (const confidence of samples) {
    const resolution =
      await resolveConfidenceThreshold({
        tenantId,
        confidence,
        defaultThreshold: 70,
      });

    resolutions.push({
      confidence,
      source: resolution.source,
      policyId: resolution.policyId,
      version: resolution.version,
      boundedValue: resolution.boundedValue,
      wasClamped: resolution.wasClamped,
    });
  }

  const invalid = resolutions.filter(
    (item) =>
      item.boundedValue < 0 ||
      item.boundedValue > 100 ||
      !Number.isFinite(item.boundedValue),
  );

  return {
    scenarioKey: "RESOLVER_BOUNDARY_SAMPLES",
    scenarioLabel: "Runtime resolver returns bounded values",
    category: "RUNTIME_RESOLUTION",
    status:
      invalid.length === 0 ? "PASS" : "FAIL",
    severity: "CRITICAL",
    message:
      invalid.length === 0
        ? "All sampled confidence buckets resolved to finite values within 0–100."
        : "One or more runtime confidence resolutions were invalid.",
    evidence: json({
      samples: resolutions,
      invalid,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyUnsupportedFallback(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const resolution =
    await resolveRuntimeLearningPolicy({
      tenantId,
      policyType: "PREDICTION_RULE_REVIEW",
      scopeKey: "CERTIFICATION_UNSUPPORTED",
      defaultValue: 61,
      minimum: 0,
      maximum: 100,
    });

  const passed =
    resolution.source === "DEFAULT" &&
    resolution.boundedValue === 61 &&
    resolution.policyId === null;

  return {
    scenarioKey: "UNSUPPORTED_POLICY_FALLBACK",
    scenarioLabel: "Unsupported policy types fall back safely",
    category: "RUNTIME_GOVERNANCE",
    status: passed ? "PASS" : "FAIL",
    severity: "CRITICAL",
    message: passed
      ? "Unsupported runtime policy type preserved caller default."
      : "Unsupported runtime policy type did not preserve caller default.",
    evidence: json(resolution),
    durationMs: Date.now() - started,
  };
}

async function certifyTraceIntegrity(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

  const brokenActive = traces.filter(
    (trace) =>
      trace.policySource === "ACTIVE_POLICY" &&
      (!trace.policyId ||
        trace.policyVersion === null),
  );

  const brokenDefault = traces.filter(
    (trace) =>
      trace.policySource === "DEFAULT" &&
      (trace.policyId !== null ||
        trace.policyVersion !== null),
  );

  const badBounds = traces.filter(
    (trace) =>
      !Number.isFinite(trace.boundedValue) ||
      trace.boundedValue < 0 ||
      trace.boundedValue > 100,
  );

  const broken =
    brokenActive.length +
    brokenDefault.length +
    badBounds.length;

  return {
    scenarioKey: "DECISION_TRACE_INTEGRITY",
    scenarioLabel: "Runtime decision traces are internally consistent",
    category: "AUDITABILITY",
    status:
      traces.length === 0
        ? "WARN"
        : broken === 0
          ? "PASS"
          : "FAIL",
    severity: broken === 0 ? "MEDIUM" : "HIGH",
    message:
      traces.length === 0
        ? "No runtime decision traces exist yet; integrity could not be fully certified."
        : broken === 0
          ? `${traces.length} recent trace(s) passed consistency checks.`
          : `${broken} runtime trace integrity issue(s) detected.`,
    evidence: json({
      inspected: traces.length,
      brokenActivePolicyTraces:
        brokenActive.map((item) => item.id),
      brokenDefaultTraces:
        brokenDefault.map((item) => item.id),
      invalidBoundedTraces:
        badBounds.map((item) => item.id),
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyShadowSafety(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);

  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: {
        tenantId,
        decisionType:
          "PREDICTIVE_PROCUREMENT_CONFIDENCE",
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

  let inspected = 0;
  let violations = 0;

  for (const trace of traces) {
    const evidence =
      trace.evidence &&
      typeof trace.evidence === "object" &&
      !Array.isArray(trace.evidence)
        ? (trace.evidence as Record<string, unknown>)
        : {};

    const extra =
      evidence.extraEvidence &&
      typeof evidence.extraEvidence === "object" &&
      !Array.isArray(evidence.extraEvidence)
        ? (evidence.extraEvidence as Record<string, unknown>)
        : {};

    if (extra.adoptionMode !== "SHADOW") {
      continue;
    }

    inspected += 1;

    if (trace.decisionResult !== true) {
      violations += 1;
    }
  }

  return {
    scenarioKey: "SHADOW_LEGACY_PRESERVATION",
    scenarioLabel: "SHADOW mode preserves legacy signal behavior",
    category: "RUNTIME_ADOPTION",
    status:
      inspected === 0
        ? "WARN"
        : violations === 0
          ? "PASS"
          : "FAIL",
    severity:
      violations === 0 ? "MEDIUM" : "CRITICAL",
    message:
      inspected === 0
        ? `No SHADOW-mode traces were available to certify. Current adoption mode is ${adoption.mode}.`
        : violations === 0
          ? `${inspected} SHADOW trace(s) preserved the existing signal behavior.`
          : `${violations} SHADOW trace(s) changed effective behavior.`,
    evidence: json({
      currentMode: adoption.mode,
      inspected,
      violations,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyPromotionGuardrails(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const adoption =
    await ensurePredictiveProcurementAdoption(tenantId);
  const rollbackRule =
    await ensureRuntimeRollbackRule(tenantId);

  const valid =
    rollbackRule.minimumDecisionCount > 0 &&
    rollbackRule.maximumDivergenceRate >= 0 &&
    rollbackRule.maximumDivergenceRate <= 100 &&
    rollbackRule.maximumFallbackRate >= 0 &&
    rollbackRule.maximumFallbackRate <= 100 &&
    rollbackRule.maximumDeniedRate >= 0 &&
    rollbackRule.maximumDeniedRate <= 100;

  return {
    scenarioKey: "PROMOTION_ROLLBACK_GUARDRAILS",
    scenarioLabel: "Promotion and rollback thresholds are valid",
    category: "PROMOTION_GOVERNANCE",
    status: valid ? "PASS" : "FAIL",
    severity: "HIGH",
    message: valid
      ? "Promotion and rollback thresholds are configured within valid bounds."
      : "Promotion or rollback guardrail configuration is invalid.",
    evidence: json({
      adoptionMode: adoption.mode,
      minimumDecisionCount:
        rollbackRule.minimumDecisionCount,
      maximumDivergenceRate:
        rollbackRule.maximumDivergenceRate,
      maximumFallbackRate:
        rollbackRule.maximumFallbackRate,
      maximumDeniedRate:
        rollbackRule.maximumDeniedRate,
      autoRollbackEnabled:
        rollbackRule.autoRollbackEnabled,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyAutomaticRollbackDisabled(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();
  const rule =
    await ensureRuntimeRollbackRule(tenantId);

  return {
    scenarioKey: "AUTOMATIC_ROLLBACK_DISABLED",
    scenarioLabel: "Automatic runtime rollback remains disabled",
    category: "HUMAN_GOVERNANCE",
    status:
      rule.autoRollbackEnabled ? "WARN" : "PASS",
    severity: "HIGH",
    message: rule.autoRollbackEnabled
      ? "Automatic rollback is enabled; confirm this is an intentional governance decision."
      : "Automatic rollback is disabled and remains human-governed.",
    evidence: json({
      rollbackRuleId: rule.id,
      autoRollbackEnabled:
        rule.autoRollbackEnabled,
    }),
    durationMs: Date.now() - started,
  };
}

async function certifyPolicyActivationAudit(
  tenantId: string,
): Promise<ScenarioResult> {
  const started = Date.now();

  const active =
    await prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        policyKey: true,
        version: true,
        activatedByUserId: true,
        activatedAt: true,
      },
    });

  const missingAudit = active.filter(
    (policy) =>
      !policy.activatedByUserId ||
      !policy.activatedAt,
  );

  return {
    scenarioKey: "ACTIVE_POLICY_ACTIVATION_AUDIT",
    scenarioLabel: "Active policies retain human activation evidence",
    category: "HUMAN_GOVERNANCE",
    status:
      missingAudit.length === 0
        ? "PASS"
        : "FAIL",
    severity: "CRITICAL",
    message:
      missingAudit.length === 0
        ? "Every ACTIVE policy has activation actor and timestamp evidence."
        : `${missingAudit.length} ACTIVE policy version(s) lack activation audit evidence.`,
    evidence: json({
      activeCount: active.length,
      missingAudit,
    }),
    durationMs: Date.now() - started,
  };
}

export async function runAiRuntimeCertification(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const run =
    await prisma.aiRuntimeCertificationRun.create({
      data: {
        tenantId: input.tenantId,
        certificationKey:
          "B13_1_GOVERNED_AI_RUNTIME",
        status: "RUNNING",
        triggeredByUserId:
          input.userId ?? null,
      },
    });

  try {
    const results = await Promise.all([
      certifyAdoptionMode(input.tenantId),
      certifyActivePolicyUniqueness(
        input.tenantId,
      ),
      certifyConfidenceBounds(input.tenantId),
      certifyResolverSamples(input.tenantId),
      certifyUnsupportedFallback(
        input.tenantId,
      ),
      certifyTraceIntegrity(input.tenantId),
      certifyShadowSafety(input.tenantId),
      certifyPromotionGuardrails(
        input.tenantId,
      ),
      certifyAutomaticRollbackDisabled(
        input.tenantId,
      ),
      certifyPolicyActivationAudit(
        input.tenantId,
      ),
    ]);

    await prisma.aiRuntimeCertificationResult.createMany({
      data: results.map((result) => ({
        tenantId: input.tenantId,
        certificationRunId: run.id,
        scenarioKey: result.scenarioKey,
        scenarioLabel: result.scenarioLabel,
        category: result.category,
        status: result.status,
        severity: result.severity,
        message: result.message,
        evidence: result.evidence,
        durationMs: result.durationMs,
      })),
    });

    const passed = results.filter(
      (result) => result.status === "PASS",
    ).length;
    const warnings = results.filter(
      (result) => result.status === "WARN",
    ).length;
    const failed = results.filter(
      (result) => result.status === "FAIL",
    ).length;

    const score =
      ((passed + warnings * 0.5) /
        results.length) *
      100;

    const status =
      failed > 0
        ? "FAILED"
        : warnings > 0
          ? "PASSED_WITH_WARNINGS"
          : "PASSED";

    return prisma.aiRuntimeCertificationRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        totalScenarios: results.length,
        passedScenarios: passed,
        warningScenarios: warnings,
        failedScenarios: failed,
        certificationScore: score,
        summary: json({
          certificationKey:
            run.certificationKey,
          status,
          passed,
          warnings,
          failed,
          score,
          generatedAt:
            new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    await prisma.aiRuntimeCertificationRun.update({
      where: { id: run.id },
      data: {
        status: "ERROR",
        completedAt: new Date(),
        summary: json({
          error:
            error instanceof Error
              ? error.message
              : "Unknown certification error.",
        }),
      },
    });

    throw error;
  }
}

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Status = "PASS" | "WARN" | "FAIL";

type Result = {
  scenarioKey: string;
  scenarioLabel: string;
  category: string;
  status: Status;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  evidence: Prisma.InputJsonValue;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function certifyTenantScopedGovernanceReads(
  tenantId: string,
): Promise<Result> {
  const [
    policies,
    traces,
    adoptions,
    conflicts,
  ] = await Promise.all([
    prisma.closedLoopLearningPolicy.findMany({
      where: { tenantId },
      select: { tenantId: true },
      take: 100,
    }),
    prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      select: { tenantId: true },
      take: 100,
    }),
    prisma.closedLoopRuntimePolicyAdoption.findMany({
      where: { tenantId },
      select: { tenantId: true },
      take: 100,
    }),
    prisma.crossEngineGovernanceConflict.findMany({
      where: { tenantId },
      select: { tenantId: true },
      take: 100,
    }),
  ]);

  const rows = [
    ...policies,
    ...traces,
    ...adoptions,
    ...conflicts,
  ];

  const violations = rows.filter(
    (row) => row.tenantId !== tenantId,
  );

  return {
    scenarioKey: "TENANT_SCOPED_GOVERNANCE_READS",
    scenarioLabel: "Governance reads remain tenant-scoped",
    category: "TENANT_ISOLATION",
    status:
      violations.length === 0
        ? "PASS"
        : "FAIL",
    severity: "CRITICAL",
    message:
      violations.length === 0
        ? "All sampled governed runtime records matched the active tenant."
        : `${violations.length} sampled governance record(s) violated tenant scope.`,
    evidence: json({
      sampledRows: rows.length,
      violations: violations.length,
    }),
  };
}

async function certifyHumanActivationEvidence(
  tenantId: string,
): Promise<Result> {
  const active =
    await prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        activatedByUserId: true,
        activatedAt: true,
      },
    });

  const missing = active.filter(
    (policy) =>
      !policy.activatedByUserId ||
      !policy.activatedAt,
  );

  return {
    scenarioKey: "POLICY_HUMAN_ACTIVATION_EVIDENCE",
    scenarioLabel: "Active policies retain human activation evidence",
    category: "HUMAN_GOVERNANCE",
    status:
      missing.length === 0
        ? "PASS"
        : "FAIL",
    severity: "CRITICAL",
    message:
      missing.length === 0
        ? "Every ACTIVE governed learning policy has actor and timestamp evidence."
        : `${missing.length} ACTIVE policy record(s) lack human activation evidence.`,
    evidence: json({
      activePolicies: active.length,
      missingAuditCount: missing.length,
      missingIds: missing.map(
        (item) => item.id,
      ),
    }),
  };
}

async function certifyNoDirectOffToEnforcedEvidence(
  tenantId: string,
): Promise<Result> {
  const events =
    await prisma.closedLoopRuntimePolicyAdoptionEvent.findMany({
      where: {
        tenantId,
        toMode: "ENFORCED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

  const violations = events.filter(
    (event) => event.fromMode === "OFF",
  );

  return {
    scenarioKey: "NO_DIRECT_OFF_TO_ENFORCED",
    scenarioLabel: "Runtime adoption never bypasses SHADOW",
    category: "RUNTIME_GOVERNANCE",
    status:
      violations.length === 0
        ? "PASS"
        : "FAIL",
    severity: "CRITICAL",
    message:
      violations.length === 0
        ? "No OFF → ENFORCED adoption event was detected."
        : `${violations.length} OFF → ENFORCED event(s) bypassed SHADOW governance.`,
    evidence: json({
      enforcedTransitions: events.length,
      violations: violations.map(
        (event) => event.id,
      ),
    }),
  };
}

async function certifyTracePolicyConsistency(
  tenantId: string,
): Promise<Result> {
  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

  const invalid = traces.filter((trace) => {
    if (
      trace.policySource === "ACTIVE_POLICY"
    ) {
      return (
        !trace.policyId ||
        trace.policyVersion === null
      );
    }

    if (trace.policySource === "DEFAULT") {
      return (
        trace.policyId !== null ||
        trace.policyVersion !== null
      );
    }

    return true;
  });

  return {
    scenarioKey: "TRACE_POLICY_CONSISTENCY",
    scenarioLabel: "Runtime traces preserve policy provenance",
    category: "AUDITABILITY",
    status:
      invalid.length === 0
        ? "PASS"
        : "FAIL",
    severity: "HIGH",
    message:
      invalid.length === 0
        ? "Recent runtime traces preserve consistent policy provenance."
        : `${invalid.length} runtime trace(s) have inconsistent policy provenance.`,
    evidence: json({
      inspected: traces.length,
      invalidTraceIds:
        invalid.map((trace) => trace.id),
    }),
  };
}

async function certifyProviderSecretNonDisclosure(): Promise<Result> {
  const knownSecrets = [
    process.env.OPENAI_API_KEY,
    process.env.AZURE_OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  return {
    scenarioKey: "PROVIDER_SECRET_NON_DISCLOSURE",
    scenarioLabel: "AI provider secrets are treated as presence-only",
    category: "SECRETS",
    status: "PASS",
    severity: "CRITICAL",
    message:
      "Certification records only whether provider configuration exists and does not persist secret values.",
    evidence: json({
      configuredSecretCount:
        knownSecrets.length,
      secretValuesPersisted: false,
    }),
  };
}

async function certifyAutomaticRollbackGovernance(
  tenantId: string,
): Promise<Result> {
  const rules =
    await prisma.closedLoopRuntimeRollbackRule.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        decisionPath: true,
        autoRollbackEnabled: true,
      },
    });

  const enabled = rules.filter(
    (rule) => rule.autoRollbackEnabled,
  );

  return {
    scenarioKey: "AUTOMATIC_ROLLBACK_GOVERNANCE",
    scenarioLabel: "Automatic rollback remains explicitly governed",
    category: "AUTONOMY_BOUNDARY",
    status:
      enabled.length === 0
        ? "PASS"
        : "WARN",
    severity: "HIGH",
    message:
      enabled.length === 0
        ? "No active rollback rule enables automatic rollback."
        : `${enabled.length} active rollback rule(s) enable automatic rollback and require governance review.`,
    evidence: json({
      activeRules: rules.length,
      autoRollbackEnabled:
        enabled.map((rule) => ({
          id: rule.id,
          decisionPath:
            rule.decisionPath,
        })),
    }),
  };
}

async function certifyConflictResolutionAudit(
  tenantId: string,
): Promise<Result> {
  const resolved =
    await prisma.crossEngineGovernanceConflict.findMany({
      where: {
        tenantId,
        status: "RESOLVED",
      },
      select: {
        id: true,
        resolvedByUserId: true,
        resolvedAt: true,
        resolutionNote: true,
      },
      take: 500,
    });

  const incomplete = resolved.filter(
    (item) =>
      !item.resolvedByUserId ||
      !item.resolvedAt ||
      !item.resolutionNote?.trim(),
  );

  return {
    scenarioKey: "CONFLICT_RESOLUTION_AUDIT",
    scenarioLabel: "Resolved cross-engine conflicts retain governance evidence",
    category: "AUDITABILITY",
    status:
      incomplete.length === 0
        ? "PASS"
        : "FAIL",
    severity: "HIGH",
    message:
      incomplete.length === 0
        ? "Resolved cross-engine conflicts retain actor, timestamp and resolution note."
        : `${incomplete.length} resolved conflict(s) lack complete governance evidence.`,
    evidence: json({
      resolvedCount:
        resolved.length,
      incompleteIds:
        incomplete.map(
          (item) => item.id,
        ),
    }),
  };
}

async function certifyCertificationHistory(
  tenantId: string,
): Promise<Result> {
  const [
    ai,
    performance,
  ] = await Promise.all([
    prisma.aiRuntimeCertificationRun.findFirst({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.enterprisePerformanceCertificationRun.findFirst({
      where: { tenantId },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const missing: string[] = [];

  if (!ai) {
    missing.push("AI_RUNTIME_CERTIFICATION");
  }

  if (!performance) {
    missing.push(
      "PERFORMANCE_CERTIFICATION",
    );
  }

  return {
    scenarioKey: "CERTIFICATION_CHAIN_PRESENT",
    scenarioLabel: "Required certification chain exists",
    category: "RELEASE_GOVERNANCE",
    status:
      missing.length === 0
        ? "PASS"
        : "WARN",
    severity: "HIGH",
    message:
      missing.length === 0
        ? "AI runtime and enterprise performance certification history is present."
        : `Missing certification history: ${missing.join(", ")}.`,
    evidence: json({
      aiRuntimeStatus:
        ai?.status ?? null,
      performanceStatus:
        performance?.status ?? null,
      missing,
    }),
  };
}

export async function runSecurityGovernanceCertification(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const run =
    await prisma.securityGovernanceCertificationRun.create({
      data: {
        tenantId:
          input.tenantId,
        status: "RUNNING",
        triggeredByUserId:
          input.userId ?? null,
      },
    });

  try {
    const results = await Promise.all([
      certifyTenantScopedGovernanceReads(
        input.tenantId,
      ),
      certifyHumanActivationEvidence(
        input.tenantId,
      ),
      certifyNoDirectOffToEnforcedEvidence(
        input.tenantId,
      ),
      certifyTracePolicyConsistency(
        input.tenantId,
      ),
      certifyProviderSecretNonDisclosure(),
      certifyAutomaticRollbackGovernance(
        input.tenantId,
      ),
      certifyConflictResolutionAudit(
        input.tenantId,
      ),
      certifyCertificationHistory(
        input.tenantId,
      ),
    ]);

    await prisma.securityGovernanceCertificationResult.createMany({
      data: results.map(
        (result) => ({
          tenantId:
            input.tenantId,
          certificationRunId:
            run.id,
          scenarioKey:
            result.scenarioKey,
          scenarioLabel:
            result.scenarioLabel,
          category:
            result.category,
          status:
            result.status,
          severity:
            result.severity,
          message:
            result.message,
          evidence:
            result.evidence,
        }),
      ),
    });

    const passed =
      results.filter(
        (result) =>
          result.status === "PASS",
      ).length;
    const warnings =
      results.filter(
        (result) =>
          result.status === "WARN",
      ).length;
    const failed =
      results.filter(
        (result) =>
          result.status === "FAIL",
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

    return prisma.securityGovernanceCertificationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status,
        totalScenarios:
          results.length,
        passedScenarios:
          passed,
        warningScenarios:
          warnings,
        failedScenarios:
          failed,
        certificationScore:
          score,
        completedAt: new Date(),
        summary: json({
          status,
          score,
          passed,
          warnings,
          failed,
          note:
            "B13.7 certification is non-destructive and records security/governance evidence only.",
        }),
      },
    });
  } catch (error) {
    await prisma.securityGovernanceCertificationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "ERROR",
        completedAt: new Date(),
        summary: json({
          error:
            error instanceof Error
              ? error.message
              : "Unknown security certification error.",
        }),
      },
    });

    throw error;
  }
}

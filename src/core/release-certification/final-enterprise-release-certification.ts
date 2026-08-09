import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAiRuntimeHealth } from "@/core/ai-monitoring/runtime-health";

type GateStatus = "PASS" | "WARN" | "FAIL";

type Gate = {
  gateKey: string;
  gateLabel: string;
  category: string;
  status: GateStatus;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  evidence: Prisma.InputJsonValue;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function statusForCertification(
  value: string | null | undefined,
): GateStatus {
  if (value === "PASSED") return "PASS";
  if (value === "PASSED_WITH_WARNINGS") return "WARN";
  return "FAIL";
}

export async function runFinalEnterpriseReleaseCertification(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const run =
    await prisma.finalEnterpriseReleaseCertificationRun.create({
      data: {
        tenantId: input.tenantId,
        releaseKey: "B13_FINAL_ENTERPRISE_RELEASE",
        status: "RUNNING",
        triggeredByUserId:
          input.userId ?? null,
      },
    });

  try {
    const [
      aiRuntimeCertification,
      performanceCertification,
      securityCertification,
      runtimeHealth,
      openConflicts,
      activePolicies,
      enforcedAdoptions,
      latestCrossEngine,
    ] = await Promise.all([
      prisma.aiRuntimeCertificationRun.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.enterprisePerformanceCertificationRun.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.securityGovernanceCertificationRun.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { createdAt: "desc" },
      }),
      calculateAiRuntimeHealth(input.tenantId),
      prisma.crossEngineGovernanceConflict.count({
        where: {
          tenantId: input.tenantId,
          status: "OPEN",
        },
      }),
      prisma.closedLoopLearningPolicy.count({
        where: {
          tenantId: input.tenantId,
          status: "ACTIVE",
        },
      }),
      prisma.closedLoopRuntimePolicyAdoption.findMany({
        where: {
          tenantId: input.tenantId,
          mode: "ENFORCED",
        },
        select: {
          id: true,
          decisionPath: true,
          decisionCount: true,
        },
      }),
      prisma.crossEngineGovernanceAssessment.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { generatedAt: "desc" },
      }),
    ]);

    const gates: Gate[] = [];

    gates.push({
      gateKey: "AI_RUNTIME_CERTIFICATION",
      gateLabel: "Governed AI runtime certification",
      category: "AI_GOVERNANCE",
      status: statusForCertification(
        aiRuntimeCertification?.status,
      ),
      severity: "CRITICAL",
      message: aiRuntimeCertification
        ? `Latest AI runtime certification status is ${aiRuntimeCertification.status}.`
        : "No AI runtime certification exists.",
      evidence: json({
        id: aiRuntimeCertification?.id ?? null,
        status:
          aiRuntimeCertification?.status ?? null,
        score:
          aiRuntimeCertification?.certificationScore ?? null,
      }),
    });

    gates.push({
      gateKey: "PERFORMANCE_CERTIFICATION",
      gateLabel: "Enterprise scale & performance certification",
      category: "PERFORMANCE",
      status: statusForCertification(
        performanceCertification?.status,
      ),
      severity: "CRITICAL",
      message: performanceCertification
        ? `Latest performance certification status is ${performanceCertification.status}.`
        : "No performance certification exists.",
      evidence: json({
        id:
          performanceCertification?.id ?? null,
        status:
          performanceCertification?.status ?? null,
        score:
          performanceCertification?.certificationScore ?? null,
        p95LatencyMs:
          performanceCertification?.p95LatencyMs ?? null,
      }),
    });

    gates.push({
      gateKey: "SECURITY_GOVERNANCE_CERTIFICATION",
      gateLabel: "Security & governance certification",
      category: "SECURITY",
      status: statusForCertification(
        securityCertification?.status,
      ),
      severity: "CRITICAL",
      message: securityCertification
        ? `Latest security certification status is ${securityCertification.status}.`
        : "No security and governance certification exists.",
      evidence: json({
        id: securityCertification?.id ?? null,
        status:
          securityCertification?.status ?? null,
        score:
          securityCertification?.certificationScore ?? null,
      }),
    });

    gates.push({
      gateKey: "AI_RUNTIME_HEALTH",
      gateLabel: "AI runtime health",
      category: "OPERATIONS",
      status:
        runtimeHealth.status === "HEALTHY"
          ? "PASS"
          : runtimeHealth.status === "WATCH"
            ? "WARN"
            : "FAIL",
      severity: "CRITICAL",
      message:
        `Current AI runtime health is ${runtimeHealth.status} with score ${runtimeHealth.healthScore.toFixed(1)}%.`,
      evidence: json({
        status: runtimeHealth.status,
        healthScore: runtimeHealth.healthScore,
        anomalyCount: runtimeHealth.anomalies.length,
        metrics: runtimeHealth.metrics,
      }),
    });

    gates.push({
      gateKey: "CROSS_ENGINE_CONFLICTS",
      gateLabel: "Cross-engine conflict posture",
      category: "AI_GOVERNANCE",
      status:
        openConflicts === 0
          ? "PASS"
          : "FAIL",
      severity: "CRITICAL",
      message:
        openConflicts === 0
          ? "No unresolved cross-engine governance conflict exists."
          : `${openConflicts} unresolved cross-engine governance conflict(s) remain.`,
      evidence: json({
        openConflicts,
        latestAlignmentScore:
          latestCrossEngine?.alignmentScore ?? null,
      }),
    });

    gates.push({
      gateKey: "ACTIVE_POLICY_POSTURE",
      gateLabel: "Governed learning-policy posture",
      category: "AI_GOVERNANCE",
      status:
        enforcedAdoptions.length === 0
          ? "PASS"
          : activePolicies > 0
            ? "PASS"
            : "FAIL",
      severity: "HIGH",
      message:
        enforcedAdoptions.length === 0
          ? "No intelligence engine is ENFORCED; active policy absence is not release-blocking."
          : activePolicies > 0
            ? `${activePolicies} ACTIVE governed learning policy record(s) support ENFORCED runtime adoption.`
            : "One or more engines are ENFORCED without any ACTIVE governed learning policy.",
      evidence: json({
        activePolicies,
        enforcedAdoptions,
      }),
    });

    const failed = gates.filter(
      (gate) => gate.status === "FAIL",
    ).length;
    const warnings = gates.filter(
      (gate) => gate.status === "WARN",
    ).length;
    const passed = gates.filter(
      (gate) => gate.status === "PASS",
    ).length;

    const readinessScore =
      ((passed + warnings * 0.5) /
        gates.length) *
      100;

    const decision =
      failed > 0
        ? "HOLD"
        : warnings > 0
          ? "CONDITIONAL_GO"
          : "GO";

    const status =
      failed > 0
        ? "FAILED"
        : warnings > 0
          ? "PASSED_WITH_WARNINGS"
          : "PASSED";

    await prisma.finalEnterpriseReleaseCertificationGate.createMany({
      data: gates.map((gate) => ({
        tenantId: input.tenantId,
        certificationRunId: run.id,
        gateKey: gate.gateKey,
        gateLabel: gate.gateLabel,
        category: gate.category,
        status: gate.status,
        severity: gate.severity,
        message: gate.message,
        evidence: gate.evidence,
      })),
    });

    return prisma.finalEnterpriseReleaseCertificationRun.update({
      where: { id: run.id },
      data: {
        status,
        readinessScore,
        totalGates: gates.length,
        passedGates: passed,
        warningGates: warnings,
        failedGates: failed,
        decision,
        completedAt: new Date(),
        summary: json({
          releaseKey: run.releaseKey,
          decision,
          status,
          readinessScore,
          passed,
          warnings,
          failed,
          note:
            "B13.8 is the final B-series release gate. It aggregates existing certification and governance evidence without modifying production state.",
        }),
      },
    });
  } catch (error) {
    await prisma.finalEnterpriseReleaseCertificationRun.update({
      where: { id: run.id },
      data: {
        status: "ERROR",
        decision: "HOLD",
        completedAt: new Date(),
        summary: json({
          error:
            error instanceof Error
              ? error.message
              : "Unknown final release certification error.",
        }),
      },
    });

    throw error;
  }
}

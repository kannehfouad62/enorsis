import { performance } from "node:perf_hooks";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAiRuntimeHealth } from "@/core/ai-monitoring/runtime-health";

type ScenarioStatus = "PASS" | "WARN" | "FAIL";

type ScenarioResult = {
  scenarioKey: string;
  scenarioLabel: string;
  category: string;
  status: ScenarioStatus;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  latencyMs: number;
  thresholdMs: number;
  message: string;
  evidence: Prisma.InputJsonValue;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function classify(
  latencyMs: number,
  thresholdMs: number,
): ScenarioStatus {
  if (latencyMs <= thresholdMs) return "PASS";
  if (latencyMs <= thresholdMs * 1.75) return "WARN";
  return "FAIL";
}

async function timed<T>(
  fn: () => Promise<T>,
) {
  const started = performance.now();
  const value = await fn();
  const latencyMs =
    performance.now() - started;

  return {
    value,
    latencyMs,
  };
}

async function scenario<T>(input: {
  scenarioKey: string;
  scenarioLabel: string;
  category: string;
  severity: ScenarioResult["severity"];
  thresholdMs: number;
  execute: () => Promise<T>;
  evidence: (value: T) => unknown;
}) {
  const { value, latencyMs } =
    await timed(input.execute);

  const status = classify(
    latencyMs,
    input.thresholdMs,
  );

  return {
    scenarioKey: input.scenarioKey,
    scenarioLabel: input.scenarioLabel,
    category: input.category,
    status,
    severity: input.severity,
    latencyMs,
    thresholdMs: input.thresholdMs,
    message:
      status === "PASS"
        ? `${input.scenarioLabel} completed within target latency.`
        : status === "WARN"
          ? `${input.scenarioLabel} exceeded target latency but remained within warning tolerance.`
          : `${input.scenarioLabel} exceeded the performance certification threshold.`,
    evidence: json(
      input.evidence(value),
    ),
  } satisfies ScenarioResult;
}

function percentile95(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * 0.95) - 1,
  );

  return sorted[index];
}

export async function runEnterprisePerformanceCertification(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const run =
    await prisma.enterprisePerformanceCertificationRun.create({
      data: {
        tenantId: input.tenantId,
        status: "RUNNING",
        triggeredByUserId:
          input.userId ?? null,
      },
    });

  try {
    const results: ScenarioResult[] = [];

    results.push(
      await scenario({
        scenarioKey: "DATABASE_PING",
        scenarioLabel: "Database connectivity probe",
        category: "DATABASE",
        severity: "CRITICAL",
        thresholdMs: 500,
        execute: async () =>
          prisma.$queryRaw<
            Array<{ ok: number }>
          >`SELECT 1 AS ok`,
        evidence: (value) => ({
          rows: value.length,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "ACTIVE_POLICY_READ",
        scenarioLabel: "Active learning-policy read",
        category: "GOVERNANCE_READ",
        severity: "HIGH",
        thresholdMs: 750,
        execute: () =>
          prisma.closedLoopLearningPolicy.findMany({
            where: {
              tenantId: input.tenantId,
              status: "ACTIVE",
            },
            select: {
              id: true,
              policyKey: true,
              policyType: true,
              version: true,
            },
            take: 200,
          }),
        evidence: (value) => ({
          rowCount: value.length,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "RUNTIME_TRACE_READ",
        scenarioLabel: "Runtime decision-trace read",
        category: "OBSERVABILITY_READ",
        severity: "HIGH",
        thresholdMs: 900,
        execute: () =>
          prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
            where: {
              tenantId: input.tenantId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 500,
            select: {
              id: true,
              decisionType: true,
              policySource: true,
              boundedValue: true,
              createdAt: true,
            },
          }),
        evidence: (value) => ({
          rowCount: value.length,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "ENGINE_ADOPTION_READ",
        scenarioLabel: "AI engine-adoption read",
        category: "GOVERNANCE_READ",
        severity: "HIGH",
        thresholdMs: 750,
        execute: () =>
          prisma.closedLoopRuntimePolicyAdoption.findMany({
            where: {
              tenantId: input.tenantId,
            },
            orderBy: {
              decisionPath: "asc",
            },
            take: 50,
          }),
        evidence: (value) => ({
          rowCount: value.length,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "CROSS_ENGINE_GOVERNANCE_READ",
        scenarioLabel: "Cross-engine governance read",
        category: "GOVERNANCE_READ",
        severity: "HIGH",
        thresholdMs: 900,
        execute: async () => {
          const [assessment, conflicts] =
            await Promise.all([
              prisma.crossEngineGovernanceAssessment.findFirst({
                where: {
                  tenantId: input.tenantId,
                },
                orderBy: {
                  generatedAt: "desc",
                },
              }),
              prisma.crossEngineGovernanceConflict.findMany({
                where: {
                  tenantId: input.tenantId,
                  status: "OPEN",
                },
                take: 100,
              }),
            ]);

          return {
            assessment,
            conflicts,
          };
        },
        evidence: (value) => ({
          hasAssessment:
            Boolean(value.assessment),
          openConflictCount:
            value.conflicts.length,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "AI_RUNTIME_HEALTH_AGGREGATION",
        scenarioLabel: "AI runtime health aggregation",
        category: "AGGREGATION",
        severity: "CRITICAL",
        thresholdMs: 1500,
        execute: () =>
          calculateAiRuntimeHealth(
            input.tenantId,
          ),
        evidence: (value) => ({
          status: value.status,
          healthScore:
            value.healthScore,
          anomalyCount:
            value.anomalies.length,
          decisionCount:
            value.metrics.decisionCount,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "BOUNDED_CONCURRENT_READ_BURST",
        scenarioLabel: "Bounded concurrent governance read burst",
        category: "CONCURRENCY",
        severity: "CRITICAL",
        thresholdMs: 2000,
        execute: async () => {
          const operations = Array.from(
            { length: 5 },
            (_, index) =>
              Promise.all([
                prisma.closedLoopRuntimePolicyAdoption.count({
                  where: {
                    tenantId:
                      input.tenantId,
                  },
                }),
                prisma.closedLoopLearningPolicy.count({
                  where: {
                    tenantId:
                      input.tenantId,
                    status: "ACTIVE",
                  },
                }),
                prisma.closedLoopRuntimePolicyDecisionTrace.count({
                  where: {
                    tenantId:
                      input.tenantId,
                  },
                }),
              ]).then((counts) => ({
                index,
                counts,
              })),
          );

          return Promise.all(operations);
        },
        evidence: (value) => ({
          concurrentGroups:
            value.length,
          operationsPerGroup: 3,
          totalReadOperations:
            value.length * 3,
        }),
      }),
    );

    results.push(
      await scenario({
        scenarioKey: "CONTROL_CENTER_COMPOSITE_READ",
        scenarioLabel: "AI control-center composite read",
        category: "AGGREGATION",
        severity: "HIGH",
        thresholdMs: 1800,
        execute: async () => {
          const [
            certification,
            healthSnapshot,
            policies,
            adoptions,
            openConflicts,
          ] = await Promise.all([
            prisma.aiRuntimeCertificationRun.findFirst({
              where: {
                tenantId:
                  input.tenantId,
              },
              orderBy: {
                createdAt: "desc",
              },
            }),
            prisma.aiRuntimeHealthSnapshot.findFirst({
              where: {
                tenantId:
                  input.tenantId,
              },
              orderBy: {
                capturedAt: "desc",
              },
            }),
            prisma.closedLoopLearningPolicy.count({
              where: {
                tenantId:
                  input.tenantId,
                status: "ACTIVE",
              },
            }),
            prisma.closedLoopRuntimePolicyAdoption.count({
              where: {
                tenantId:
                  input.tenantId,
              },
            }),
            prisma.crossEngineGovernanceConflict.count({
              where: {
                tenantId:
                  input.tenantId,
                status: "OPEN",
              },
            }),
          ]);

          return {
            certification:
              certification?.status ??
              null,
            healthSnapshot:
              healthSnapshot?.status ??
              null,
            policies,
            adoptions,
            openConflicts,
          };
        },
        evidence: (value) => value,
      }),
    );

    const latencies = results.map(
      (result) => result.latencyMs,
    );

    const passed = results.filter(
      (result) =>
        result.status === "PASS",
    ).length;
    const warnings = results.filter(
      (result) =>
        result.status === "WARN",
    ).length;
    const failed = results.filter(
      (result) =>
        result.status === "FAIL",
    ).length;

    const score =
      ((passed + warnings * 0.5) /
        results.length) *
      100;

    const averageLatencyMs =
      latencies.reduce(
        (sum, value) => sum + value,
        0,
      ) / latencies.length;

    const p95LatencyMs =
      percentile95(latencies);

    await prisma.enterprisePerformanceCertificationResult.createMany({
      data: results.map((result) => ({
        tenantId: input.tenantId,
        certificationRunId: run.id,
        scenarioKey:
          result.scenarioKey,
        scenarioLabel:
          result.scenarioLabel,
        category: result.category,
        status: result.status,
        severity: result.severity,
        latencyMs: result.latencyMs,
        thresholdMs:
          result.thresholdMs,
        message: result.message,
        evidence: result.evidence,
      })),
    });

    const status =
      failed > 0
        ? "FAILED"
        : warnings > 0
          ? "PASSED_WITH_WARNINGS"
          : "PASSED";

    return prisma.enterprisePerformanceCertificationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status,
        certificationScore:
          score,
        totalScenarios:
          results.length,
        passedScenarios:
          passed,
        warningScenarios:
          warnings,
        failedScenarios:
          failed,
        averageLatencyMs,
        p95LatencyMs,
        completedAt: new Date(),
        summary: json({
          status,
          score,
          averageLatencyMs,
          p95LatencyMs,
          scenarioCount:
            results.length,
          note:
            "B13.6 uses bounded read-only performance probes. It does not create synthetic procurement transactions.",
        }),
      },
    });
  } catch (error) {
    await prisma.enterprisePerformanceCertificationRun.update({
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
              : "Unknown performance certification error.",
        }),
      },
    });

    throw error;
  }
}

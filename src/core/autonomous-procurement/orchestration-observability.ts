import { prisma } from "@/lib/prisma";

const MINUTE = 60_000;

function minutesBetween(
  start: Date | null | undefined,
  end: Date | null | undefined,
) {
  if (!start || !end) return null;
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / MINUTE),
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(
      0,
      Math.ceil((p / 100) * sorted.length) - 1,
    ),
  );
  return sorted[index];
}

export async function getAutonomousOrchestrationObservability(
  tenantId: string,
) {
  const [runs, events, escalations, signals] =
    await Promise.all([
      prisma.autonomousProcurementOrchestrationRun.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.autonomousProcurementOrchestrationEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 2500,
      }),
      prisma.autonomousProcurementOrchestrationEscalation.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.autonomousProcurementOrchestrationSignal.findMany({
        where: { tenantId },
        orderBy: { receivedAt: "desc" },
        take: 1000,
      }),
    ]);

  const completed = runs.filter(
    (run) => run.status === "COMPLETED",
  );
  const failed = runs.filter(
    (run) => run.status === "FAILED",
  );
  const paused = runs.filter(
    (run) => run.status === "PAUSED",
  );
  const active = runs.filter((run) =>
    ["READY", "RUNNING", "RETRY"].includes(run.status),
  );

  const cycleTimes = completed
    .map((run) =>
      minutesBetween(run.startedAt, run.completedAt),
    )
    .filter(
      (value): value is number => value !== null,
    );

  const stageCounts = new Map<string, number>();
  for (const run of runs) {
    stageCounts.set(
      run.stage,
      (stageCounts.get(run.stage) ?? 0) + 1,
    );
  }

  const workflowCounts = new Map<
    string,
    {
      total: number;
      completed: number;
      failed: number;
      paused: number;
    }
  >();

  for (const run of runs) {
    const current = workflowCounts.get(
      run.targetWorkflow,
    ) ?? {
      total: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    };

    current.total += 1;
    if (run.status === "COMPLETED") {
      current.completed += 1;
    }
    if (run.status === "FAILED") {
      current.failed += 1;
    }
    if (run.status === "PAUSED") {
      current.paused += 1;
    }

    workflowCounts.set(run.targetWorkflow, current);
  }

  const eventCounts = new Map<string, number>();
  for (const item of events) {
    eventCounts.set(
      item.eventType,
      (eventCounts.get(item.eventType) ?? 0) + 1,
    );
  }

  const openEscalations = escalations.filter(
    (item) => item.status !== "RESOLVED",
  );
  const criticalEscalations = openEscalations.filter(
    (item) => item.severity === "CRITICAL",
  );

  const processedSignals = signals.filter(
    (item) => item.status === "PROCESSED",
  );
  const ignoredSignals = signals.filter(
    (item) => item.status === "IGNORED",
  );

  const completionRate =
    runs.length === 0
      ? 0
      : (completed.length / runs.length) * 100;

  const failureRate =
    runs.length === 0
      ? 0
      : (failed.length / runs.length) * 100;

  const signalSuccessRate =
    signals.length === 0
      ? 0
      : (processedSignals.length / signals.length) *
        100;

  const traceByRun = new Map<
    string,
    typeof events
  >();

  for (const item of events) {
    const current =
      traceByRun.get(item.orchestrationRunId) ?? [];
    current.push(item);
    traceByRun.set(
      item.orchestrationRunId,
      current,
    );
  }

  return {
    runs,
    events,
    escalations,
    signals,
    traceByRun,
    metrics: {
      totalRuns: runs.length,
      activeRuns: active.length,
      pausedRuns: paused.length,
      completedRuns: completed.length,
      failedRuns: failed.length,
      completionRate,
      failureRate,
      averageCycleMinutes: average(cycleTimes),
      p95CycleMinutes: percentile(cycleTimes, 95),
      openEscalations: openEscalations.length,
      criticalEscalations:
        criticalEscalations.length,
      signalSuccessRate,
      ignoredSignals: ignoredSignals.length,
    },
    stageDistribution: Array.from(
      stageCounts.entries(),
    )
      .map(([stage, count]) => ({
        stage,
        count,
      }))
      .sort((a, b) => b.count - a.count),
    workflowDistribution: Array.from(
      workflowCounts.entries(),
    )
      .map(([workflow, values]) => ({
        workflow,
        ...values,
        completionRate:
          values.total === 0
            ? 0
            : (values.completed /
                values.total) *
              100,
      }))
      .sort((a, b) => b.total - a.total),
    eventDistribution: Array.from(
      eventCounts.entries(),
    )
      .map(([eventType, count]) => ({
        eventType,
        count,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

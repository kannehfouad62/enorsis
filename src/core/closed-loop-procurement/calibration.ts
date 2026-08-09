import { prisma } from "@/lib/prisma";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function absolute(value: number | null) {
  return value === null ? null : Math.abs(value);
}

export async function getPredictionCalibrationAnalytics(
  tenantId: string,
) {
  const [outcomes, metrics] = await Promise.all([
    prisma.closedLoopProcurementOutcome.findMany({
      where: {
        tenantId,
        status: "VALIDATED",
        outcomeQuality: {
          in: ["VALIDATED", "PARTIAL"],
        },
      },
      orderBy: { validatedAt: "desc" },
      take: 1000,
    }),
    prisma.closedLoopProcurementOutcomeMetric.findMany({
      where: {
        tenantId,
        status: "VALIDATED",
        predictedValue: {
          not: null,
        },
        actualValue: {
          not: null,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const outcomeIds = new Set(outcomes.map((item) => item.id));
  const validatedMetrics = metrics.filter((item) =>
    outcomeIds.has(item.outcomeId),
  );

  const absoluteVariancePercent = validatedMetrics
    .map((item) => absolute(item.variancePercent))
    .filter((value): value is number => value !== null);

  const absoluteVarianceValue = validatedMetrics
    .map((item) => absolute(item.varianceValue))
    .filter((value): value is number => value !== null);

  const workflowStats = new Map<
    string,
    {
      outcomes: number;
      metrics: number;
      completedIndicators: number;
      successfulIndicators: number;
      variancePercent: number[];
    }
  >();

  for (const outcome of outcomes) {
    const current = workflowStats.get(outcome.targetWorkflow) ?? {
      outcomes: 0,
      metrics: 0,
      completedIndicators: 0,
      successfulIndicators: 0,
      variancePercent: [],
    };

    current.outcomes += 1;
    workflowStats.set(outcome.targetWorkflow, current);
  }

  for (const metric of validatedMetrics) {
    const outcome = outcomes.find(
      (item) => item.id === metric.outcomeId,
    );

    if (!outcome) continue;

    const current = workflowStats.get(outcome.targetWorkflow)!;
    current.metrics += 1;

    if (metric.unit === "BOOLEAN") {
      current.completedIndicators += 1;
      if (metric.actualValue === 1) {
        current.successfulIndicators += 1;
      }
    }

    if (metric.variancePercent !== null) {
      current.variancePercent.push(
        Math.abs(metric.variancePercent),
      );
    }
  }

  const metricStats = new Map<
    string,
    {
      label: string;
      unit: string | null;
      count: number;
      absoluteVariancePercent: number[];
      absoluteVarianceValue: number[];
      confidence: number[];
      successfulBoolean: number;
      booleanCount: number;
    }
  >();

  for (const metric of validatedMetrics) {
    const current = metricStats.get(metric.metricKey) ?? {
      label: metric.metricLabel,
      unit: metric.unit,
      count: 0,
      absoluteVariancePercent: [],
      absoluteVarianceValue: [],
      confidence: [],
      successfulBoolean: 0,
      booleanCount: 0,
    };

    current.count += 1;

    if (metric.variancePercent !== null) {
      current.absoluteVariancePercent.push(
        Math.abs(metric.variancePercent),
      );
    }

    if (metric.varianceValue !== null) {
      current.absoluteVarianceValue.push(
        Math.abs(metric.varianceValue),
      );
    }

    if (metric.confidence !== null) {
      current.confidence.push(metric.confidence);
    }

    if (metric.unit === "BOOLEAN") {
      current.booleanCount += 1;
      if (metric.actualValue === 1) {
        current.successfulBoolean += 1;
      }
    }

    metricStats.set(metric.metricKey, current);
  }

  const confidenceBuckets = [
    { label: "0–20", min: 0, max: 20 },
    { label: "20–40", min: 20, max: 40 },
    { label: "40–60", min: 40, max: 60 },
    { label: "60–80", min: 60, max: 80 },
    { label: "80–100", min: 80, max: 101 },
  ];

  const calibration = confidenceBuckets.map((bucket) => {
    const bucketMetrics = validatedMetrics.filter(
      (metric) =>
        metric.confidence !== null &&
        metric.confidence >= bucket.min &&
        metric.confidence < bucket.max,
    );

    const accuracyScores = bucketMetrics
      .map((metric) => {
        if (metric.unit === "BOOLEAN") {
          return metric.actualValue === 1 ? 100 : 0;
        }

        if (metric.variancePercent === null) {
          return null;
        }

        return Math.max(
          0,
          100 - Math.abs(metric.variancePercent),
        );
      })
      .filter((value): value is number => value !== null);

    return {
      bucket: bucket.label,
      count: bucketMetrics.length,
      averageConfidence:
        bucketMetrics.length === 0
          ? 0
          : average(
              bucketMetrics
                .map((metric) => metric.confidence)
                .filter(
                  (value): value is number =>
                    value !== null,
                ),
            ),
      observedAccuracy: average(accuracyScores),
      calibrationGap:
        bucketMetrics.length === 0
          ? 0
          : average(
              bucketMetrics
                .map((metric) => metric.confidence)
                .filter(
                  (value): value is number =>
                    value !== null,
                ),
            ) - average(accuracyScores),
    };
  });

  const recommendationEffectiveness =
    validatedMetrics.filter(
      (metric) => metric.unit === "BOOLEAN",
    );

  const successCount = recommendationEffectiveness.filter(
    (metric) => metric.actualValue === 1,
  ).length;

  return {
    metrics: {
      validatedOutcomes: outcomes.length,
      validatedMetrics: validatedMetrics.length,
      meanAbsolutePercentageError:
        average(absoluteVariancePercent),
      medianAbsolutePercentageError:
        median(absoluteVariancePercent),
      p95AbsolutePercentageError:
        percentile(absoluteVariancePercent, 95),
      meanAbsoluteError:
        average(absoluteVarianceValue),
      recommendationEffectiveness:
        recommendationEffectiveness.length === 0
          ? 0
          : (successCount /
              recommendationEffectiveness.length) *
            100,
    },
    workflowPerformance: Array.from(
      workflowStats.entries(),
    )
      .map(([workflow, stats]) => ({
        workflow,
        outcomes: stats.outcomes,
        metrics: stats.metrics,
        recommendationEffectiveness:
          stats.completedIndicators === 0
            ? 0
            : (stats.successfulIndicators /
                stats.completedIndicators) *
              100,
        meanAbsolutePercentageError:
          average(stats.variancePercent),
      }))
      .sort((a, b) => b.outcomes - a.outcomes),
    metricPerformance: Array.from(
      metricStats.entries(),
    )
      .map(([metricKey, stats]) => ({
        metricKey,
        label: stats.label,
        unit: stats.unit,
        count: stats.count,
        meanAbsolutePercentageError:
          average(stats.absoluteVariancePercent),
        meanAbsoluteError:
          average(stats.absoluteVarianceValue),
        averageConfidence: average(stats.confidence),
        recommendationEffectiveness:
          stats.booleanCount === 0
            ? null
            : (stats.successfulBoolean /
                stats.booleanCount) *
              100,
      }))
      .sort((a, b) => b.count - a.count),
    calibration,
  };
}

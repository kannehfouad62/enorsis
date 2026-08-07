import { prisma } from "@/lib/prisma";
import type { DeterministicExecutiveInsightCandidate } from "./types";

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function confidence(input: {
  sourceRecordCount: number;
  hasTarget: boolean;
  hasPrevious: boolean;
}) {
  let score = 70;
  if (input.sourceRecordCount >= 10) score += 10;
  if (input.sourceRecordCount >= 100) score += 5;
  if (input.hasTarget) score += 8;
  if (input.hasPrevious) score += 7;
  return Math.min(99, score);
}

export async function evaluateExecutiveInsightRules(input: {
  tenantId: string;
}) {
  const snapshots =
    await prisma.enterpriseAnalyticsMetricSnapshot.findMany({
      where: {
        tenantId: input.tenantId,
        dimensionKey: "ALL",
      },
      include: {
        metricDefinition: true,
      },
      orderBy: { calculatedAt: "desc" },
      take: 500,
    });

  const latest = new Map<string, (typeof snapshots)[number]>();

  for (const snapshot of snapshots) {
    if (!latest.has(snapshot.metricDefinition.metricKey)) {
      latest.set(snapshot.metricDefinition.metricKey, snapshot);
    }
  }

  const candidates: DeterministicExecutiveInsightCandidate[] = [];

  for (const snapshot of latest.values()) {
    const definition = snapshot.metricDefinition;
    const current = number(snapshot.numericValue);
    const previous =
      snapshot.previousValue !== null
        ? number(snapshot.previousValue)
        : null;
    const target =
      snapshot.targetValue !== null
        ? number(snapshot.targetValue)
        : definition.targetValue !== null
          ? number(definition.targetValue)
          : null;

    const baseConfidence = confidence({
      sourceRecordCount: snapshot.sourceRecordCount,
      hasTarget: target !== null,
      hasPrevious: previous !== null,
    });

    if (
      ["CRITICAL", "WARNING"].includes(snapshot.healthStatus)
    ) {
      candidates.push({
        insightKey: `health.${definition.metricKey}`,
        type: "RISK",
        severity:
          snapshot.healthStatus === "CRITICAL" ? "CRITICAL" : "HIGH",
        title: `${definition.name} requires executive attention`,
        executiveSummary:
          `${definition.name} is currently classified as ${snapshot.healthStatus.toLowerCase()}.`,
        explanation:
          target !== null
            ? `The observed value is ${current}, compared with a governed target of ${target}.`
            : `The current KPI state is ${snapshot.healthStatus.toLowerCase()} based on governed thresholds.`,
        recommendation:
          definition.drilldownPath
            ? `Review the underlying operational drivers at ${definition.drilldownPath}.`
            : "Review the source operational records and confirm corrective action.",
        confidenceScore: baseConfidence,
        domain: definition.domain,
        category: definition.category,
        sourceModule: definition.sourceModule ?? "enterprise-analytics",
        requiresHumanReview: snapshot.healthStatus === "CRITICAL",
        evidence: [
          {
            metricKey: definition.metricKey,
            sourceType: "EnterpriseAnalyticsMetricSnapshot",
            sourceId: snapshot.id,
            label: definition.name,
            observedValue: String(current),
            expectedValue:
              target !== null ? String(target) : snapshot.healthStatus,
            evidence: {
              healthStatus: snapshot.healthStatus,
              trendDirection: snapshot.trendDirection,
              calculatedAt: snapshot.calculatedAt.toISOString(),
              sourceRecordCount: snapshot.sourceRecordCount,
            },
          },
        ],
      });
    }

    if (
      previous !== null &&
      definition.higherIsBetter &&
      current < previous
    ) {
      const declinePercent =
        previous !== 0
          ? ((previous - current) / Math.abs(previous)) * 100
          : 0;

      if (declinePercent >= 10) {
        candidates.push({
          insightKey: `decline.${definition.metricKey}`,
          type: "PERFORMANCE",
          severity: declinePercent >= 25 ? "HIGH" : "MEDIUM",
          title: `${definition.name} has materially declined`,
          executiveSummary:
            `${definition.name} declined ${declinePercent.toFixed(1)}% from the previous period.`,
          explanation:
            `The KPI moved from ${previous} to ${current}. Because higher values are governed as better for this KPI, the change represents deterioration.`,
          recommendation:
            "Review the operating drivers behind the decline and confirm whether intervention is required.",
          confidenceScore: baseConfidence,
          domain: definition.domain,
          category: definition.category,
          sourceModule: definition.sourceModule ?? "enterprise-analytics",
          evidence: [
            {
              metricKey: definition.metricKey,
              sourceType: "EnterpriseAnalyticsMetricSnapshot",
              sourceId: snapshot.id,
              label: definition.name,
              observedValue: String(current),
              expectedValue: String(previous),
              evidence: {
                trendDirection: snapshot.trendDirection,
                declinePercent,
              },
            },
          ],
        });
      }
    }

    if (
      previous !== null &&
      !definition.higherIsBetter &&
      current > previous
    ) {
      const worseningPercent =
        previous !== 0
          ? ((current - previous) / Math.abs(previous)) * 100
          : 0;

      if (worseningPercent >= 10) {
        candidates.push({
          insightKey: `worsening.${definition.metricKey}`,
          type: "RISK",
          severity: worseningPercent >= 25 ? "HIGH" : "MEDIUM",
          title: `${definition.name} is worsening`,
          executiveSummary:
            `${definition.name} increased ${worseningPercent.toFixed(1)}% from the previous period.`,
          explanation:
            `The KPI moved from ${previous} to ${current}. Because lower values are governed as better for this KPI, the change indicates increased exposure.`,
          recommendation:
            "Investigate the root cause and validate whether the trend requires corrective action.",
          confidenceScore: baseConfidence,
          domain: definition.domain,
          category: definition.category,
          sourceModule: definition.sourceModule ?? "enterprise-analytics",
          evidence: [
            {
              metricKey: definition.metricKey,
              sourceType: "EnterpriseAnalyticsMetricSnapshot",
              sourceId: snapshot.id,
              label: definition.name,
              observedValue: String(current),
              expectedValue: String(previous),
              evidence: {
                trendDirection: snapshot.trendDirection,
                worseningPercent,
              },
            },
          ],
        });
      }
    }

    if (
      target !== null &&
      definition.higherIsBetter &&
      current >= target &&
      snapshot.healthStatus === "GOOD"
    ) {
      candidates.push({
        insightKey: `opportunity.${definition.metricKey}`,
        type: "OPPORTUNITY",
        severity: "LOW",
        title: `${definition.name} is meeting or exceeding target`,
        executiveSummary:
          `${definition.name} is performing at or above its governed target.`,
        explanation:
          `The current value is ${current} compared with a target of ${target}.`,
        recommendation:
          "Preserve the operating practices contributing to this result and consider using them as a benchmark.",
        confidenceScore: baseConfidence,
        domain: definition.domain,
        category: definition.category,
        sourceModule: definition.sourceModule ?? "enterprise-analytics",
        evidence: [
          {
            metricKey: definition.metricKey,
            sourceType: "EnterpriseAnalyticsMetricSnapshot",
            sourceId: snapshot.id,
            label: definition.name,
            observedValue: String(current),
            expectedValue: String(target),
          },
        ],
      });
    }
  }

  return candidates;
}

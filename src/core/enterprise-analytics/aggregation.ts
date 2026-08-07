import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { ensureEnterpriseAnalyticsDefinitions } from "./definitions";
import { enterpriseAnalyticsCalculators } from "./registry";
import type { AnalyticsPeriod } from "./types";

function trend(
  current: number,
  previous: number | null,
): "UP" | "DOWN" | "FLAT" | "NOT_AVAILABLE" {
  if (previous === null) return "NOT_AVAILABLE";
  if (current > previous) return "UP";
  if (current < previous) return "DOWN";
  return "FLAT";
}

function health(input: {
  current: number;
  target: number | null;
  warning: number | null;
  critical: number | null;
  higherIsBetter: boolean;
}): "GOOD" | "WATCH" | "WARNING" | "CRITICAL" | "NOT_AVAILABLE" {
  if (input.target === null && input.warning === null && input.critical === null) {
    return "NOT_AVAILABLE";
  }

  if (input.higherIsBetter) {
    if (input.critical !== null && input.current <= input.critical) return "CRITICAL";
    if (input.warning !== null && input.current <= input.warning) return "WARNING";
    if (input.target !== null && input.current < input.target) return "WATCH";
    return "GOOD";
  }

  if (input.critical !== null && input.current >= input.critical) return "CRITICAL";
  if (input.warning !== null && input.current >= input.warning) return "WARNING";
  if (input.target !== null && input.current > input.target) return "WATCH";
  return "GOOD";
}

export async function runEnterpriseAnalyticsAggregation(input: {
  tenantId: string;
  scope: string;
  period: AnalyticsPeriod;
  actorUserId?: string | null;
}) {
  await ensureEnterpriseAnalyticsDefinitions(input.tenantId);

  const definitions =
    await prisma.enterpriseAnalyticsMetricDefinition.findMany({
      where: {
        tenantId: input.tenantId,
        active: true,
      },
      orderBy: { metricKey: "asc" },
    });

  const count = await prisma.enterpriseAnalyticsAggregationRun.count({
    where: { tenantId: input.tenantId },
  });

  const run =
    await prisma.enterpriseAnalyticsAggregationRun.create({
      data: {
        tenantId: input.tenantId,
        runNumber: `ANA-${new Date().getFullYear()}-${String(
          count + 1,
        ).padStart(7, "0")}`,
        scope: input.scope,
        status: "RUNNING",
        periodType: input.period.periodType,
        periodStart: input.period.periodStart,
        periodEnd: input.period.periodEnd,
        startedAt: new Date(),
        initiatedByUserId: input.actorUserId ?? null,
        metricsRequested: definitions.length,
      },
    });

  let calculated = 0;
  let warningCount = 0;
  let failureCount = 0;

  for (const definition of definitions) {
    const calculator =
      enterpriseAnalyticsCalculators[definition.metricKey];

    if (!calculator) {
      warningCount += 1;
      await prisma.enterpriseAnalyticsAggregationFailure.create({
        data: {
          tenantId: input.tenantId,
          aggregationRunId: run.id,
          metricKey: definition.metricKey,
          sourceModule: definition.sourceModule,
          severity: "LOW",
          message: "No calculator is registered for this metric.",
          details: toJson({
            metricKey: definition.metricKey,
          }),
        },
      });
      continue;
    }

    try {
      const calculations = await calculator({
        tenantId: input.tenantId,
        period: input.period,
      });

      for (const calculation of calculations) {
        const dimensionKey = calculation.dimensionKey ?? "ALL";

        const previous =
          await prisma.enterpriseAnalyticsMetricSnapshot.findFirst({
            where: {
              tenantId: input.tenantId,
              metricDefinitionId: definition.id,
              dimensionKey,
              periodStart: {
                lt: input.period.periodStart,
              },
            },
            orderBy: { periodStart: "desc" },
          });

        const current = calculation.value;
        const previousValue =
          previous !== null ? Number(previous.numericValue) : null;
        const targetValue =
          definition.targetValue !== null
            ? Number(definition.targetValue)
            : null;
        const varianceValue =
          targetValue !== null ? current - targetValue : null;
        const variancePercent =
          targetValue !== null && targetValue !== 0
            ? ((current - targetValue) / Math.abs(targetValue)) * 100
            : null;

        await prisma.enterpriseAnalyticsMetricSnapshot.upsert({
          where: {
            tenantId_metricDefinitionId_periodType_periodStart_dimensionKey: {
              tenantId: input.tenantId,
              metricDefinitionId: definition.id,
              periodType: input.period.periodType,
              periodStart: input.period.periodStart,
              dimensionKey,
            },
          },
          create: {
            tenantId: input.tenantId,
            metricDefinitionId: definition.id,
            periodType: input.period.periodType,
            periodStart: input.period.periodStart,
            periodEnd: input.period.periodEnd,
            numericValue: current,
            previousValue,
            targetValue,
            varianceValue,
            variancePercent,
            trendDirection: trend(current, previousValue),
            healthStatus: health({
              current,
              target: targetValue,
              warning:
                definition.warningThreshold !== null
                  ? Number(definition.warningThreshold)
                  : null,
              critical:
                definition.criticalThreshold !== null
                  ? Number(definition.criticalThreshold)
                  : null,
              higherIsBetter: definition.higherIsBetter,
            }),
            dimensionKey,
            dimensions: toJson(calculation.dimensions ?? {}),
            calculationVersion: definition.calculationVersion,
            sourceRecordCount: calculation.sourceRecordCount,
            aggregationRunId: run.id,
          },
          update: {
            periodEnd: input.period.periodEnd,
            numericValue: current,
            previousValue,
            targetValue,
            varianceValue,
            variancePercent,
            trendDirection: trend(current, previousValue),
            healthStatus: health({
              current,
              target: targetValue,
              warning:
                definition.warningThreshold !== null
                  ? Number(definition.warningThreshold)
                  : null,
              critical:
                definition.criticalThreshold !== null
                  ? Number(definition.criticalThreshold)
                  : null,
              higherIsBetter: definition.higherIsBetter,
            }),
            dimensions: toJson(calculation.dimensions ?? {}),
            calculationVersion: definition.calculationVersion,
            sourceRecordCount: calculation.sourceRecordCount,
            calculatedAt: new Date(),
            aggregationRunId: run.id,
          },
        });

        calculated += 1;
      }
    } catch (error) {
      failureCount += 1;
      await prisma.enterpriseAnalyticsAggregationFailure.create({
        data: {
          tenantId: input.tenantId,
          aggregationRunId: run.id,
          metricKey: definition.metricKey,
          sourceModule: definition.sourceModule,
          severity: "HIGH",
          message:
            error instanceof Error
              ? error.message
              : "Unknown analytics calculation error.",
          details: toJson({
            metricKey: definition.metricKey,
          }),
        },
      });
    }
  }

  const status =
    failureCount > 0
      ? calculated > 0
        ? "COMPLETED_WITH_WARNINGS"
        : "FAILED"
      : warningCount > 0
        ? "COMPLETED_WITH_WARNINGS"
        : "COMPLETED";

  const completed =
    await prisma.enterpriseAnalyticsAggregationRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        metricsCalculated: calculated,
        warningCount,
        failureCount,
        summary: toJson({
          requested: definitions.length,
          calculated,
          warningCount,
          failureCount,
        }),
      },
      include: {
        failures: true,
      },
    });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "EnterpriseAnalytics.AggregationCompleted",
    aggregateType: "EnterpriseAnalyticsAggregationRun",
    aggregateId: run.id,
    sourceModule: "enterprise-analytics",
    actorUserId: input.actorUserId ?? undefined,
    payload: {
      runId: run.id,
      runNumber: run.runNumber,
      status,
      calculated,
      warningCount,
      failureCount,
    },
  });

  if (input.actorUserId) {
    await recordEnterpriseActivity({
      tenantId: input.tenantId,
      activityType: "EnterpriseAnalytics.AggregationCompleted",
      sourceModule: "enterprise-analytics",
      title: "Enterprise analytics aggregation completed",
      description: run.runNumber,
      severity:
        status === "FAILED"
          ? "ERROR"
          : status === "COMPLETED_WITH_WARNINGS"
            ? "WARNING"
            : "SUCCESS",
      actorUserId: input.actorUserId,
      subjectType: "EnterpriseAnalyticsAggregationRun",
      subjectId: run.id,
      subjectLabel: run.runNumber,
      actionUrl: "/app/executive/analytics-foundation",
    });
  }

  return completed;
}

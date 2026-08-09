import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function metricSeeds(
  targetWorkflow: string,
  snapshot: JsonObject,
) {
  const seeds: Array<{
    key: string;
    label: string;
    unit?: string;
    predictedValue?: number | null;
    confidence?: number | null;
    evidence?: Prisma.InputJsonValue;
  }> = [];

  const execution = object(snapshot.executionPayload);
  const proposed = object(snapshot.proposed);

  const confidence =
    number(execution.confidence) ??
    number(snapshot.confidence);

  const proposedValue =
    number(proposed.valueUsd) ??
    number(execution.proposedValueUsd);

  const estimatedSavings =
    number(execution.estimatedSavingsUsd);

  const estimatedExposure =
    number(execution.estimatedExposureUsd);

  const proposedQuantity =
    number(proposed.quantity) ??
    number(execution.proposedQuantity) ??
    number(execution.recommendedQuantity);

  if (proposedValue !== null) {
    seeds.push({
      key: "PROPOSED_VALUE_USD",
      label: "Proposed value",
      unit: "USD",
      predictedValue: proposedValue,
      confidence,
    });
  }

  if (estimatedSavings !== null) {
    seeds.push({
      key: "EXPECTED_SAVINGS_USD",
      label: "Expected savings",
      unit: "USD",
      predictedValue: estimatedSavings,
      confidence,
    });
  }

  if (estimatedExposure !== null) {
    seeds.push({
      key: "EXPECTED_EXPOSURE_USD",
      label: "Expected risk exposure",
      unit: "USD",
      predictedValue: estimatedExposure,
      confidence,
    });
  }

  if (proposedQuantity !== null) {
    seeds.push({
      key: "PROPOSED_QUANTITY",
      label: "Proposed quantity",
      unit: "EA",
      predictedValue: proposedQuantity,
      confidence,
    });
  }

  if (targetWorkflow === "PURCHASE_REQUEST") {
    seeds.push({
      key: "NATIVE_PR_CREATED",
      label: "Purchase Request created",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  if (targetWorkflow === "STRATEGIC_SOURCING") {
    seeds.push({
      key: "NATIVE_SOURCING_EVENT_CREATED",
      label: "Sourcing event created",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  if (targetWorkflow === "RISK_MITIGATION") {
    seeds.push({
      key: "MITIGATION_PLAN_CREATED",
      label: "Risk mitigation plan created",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  if (targetWorkflow === "VALUE_REALIZATION") {
    seeds.push({
      key: "VALUE_INITIATIVE_CREATED",
      label: "Value initiative created",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  if (targetWorkflow === "INVENTORY_REBALANCE") {
    seeds.push({
      key: "TRANSFER_DRAFT_CREATED",
      label: "Inventory transfer draft created",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  if (seeds.length === 0) {
    seeds.push({
      key: "NATIVE_HANDOFF_COMPLETED",
      label: "Native handoff completed",
      unit: "BOOLEAN",
      predictedValue: 1,
      confidence: 100,
    });
  }

  return seeds;
}

export async function discoverClosedLoopOutcomes() {
  const runs =
    await prisma.autonomousProcurementOrchestrationRun.findMany({
      where: {
        status: "COMPLETED",
        nativeReferenceId: {
          not: null,
        },
      },
      orderBy: { completedAt: "asc" },
      take: 200,
    });

  let created = 0;

  for (const run of runs) {
    const existing =
      await prisma.closedLoopProcurementOutcome.findFirst({
        where: {
          tenantId: run.tenantId,
          orchestrationRunId: run.id,
        },
        select: { id: true },
      });

    if (existing) continue;

    const handoff =
      await prisma.autonomousExecutionHandoff.findFirst({
        where: {
          id: run.executionHandoffId,
          tenantId: run.tenantId,
        },
      });

    const envelope =
      await prisma.autonomousExecutionEnvelope.findFirst({
        where: {
          id: run.executionEnvelopeId,
          tenantId: run.tenantId,
        },
      });

    const executionPayload =
      handoff?.payload === null ||
      handoff?.payload === undefined
        ? {}
        : object(handoff.payload);

    const sourceSnapshot: Prisma.InputJsonValue =
      toInputJson({
        orchestrationRun: {
          id: run.id,
          targetWorkflow: run.targetWorkflow,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          attemptCount: run.attemptCount,
        },
        executionHandoff: handoff
          ? {
              id: handoff.id,
              status: handoff.status,
              targetWorkflow:
                handoff.targetWorkflow,
            }
          : null,
        executionEnvelope: envelope
          ? {
              id: envelope.id,
              status: envelope.status,
              releasedByUserId:
                envelope.releasedByUserId,
            }
          : null,
        executionPayload,
        nativeReferenceType:
          run.nativeReferenceType,
        nativeReferenceId:
          run.nativeReferenceId,
        nativeReferenceUrl:
          run.nativeReferenceUrl,
      });

    const confidence =
      number(executionPayload.confidence) ??
      number(
        object(executionPayload.executionPayload)
          .confidence,
      );

    const outcome =
      await prisma.closedLoopProcurementOutcome.create({
        data: {
          tenantId: run.tenantId,
          orchestrationRunId: run.id,
          executionHandoffId:
            run.executionHandoffId,
          targetWorkflow: run.targetWorkflow,
          nativeReferenceType:
            run.nativeReferenceType,
          nativeReferenceId:
            run.nativeReferenceId,
          nativeReferenceUrl:
            run.nativeReferenceUrl,
          status: "OPEN",
          sourceConfidence: confidence,
          outcomeQuality: "UNVERIFIED",
          sourceSnapshot,
        },
      });

    const seeds = metricSeeds(
      run.targetWorkflow,
      executionPayload,
    );

    if (seeds.length > 0) {
      await prisma.closedLoopProcurementOutcomeMetric.createMany({
        data: seeds.map((seed) => ({
          tenantId: run.tenantId,
          outcomeId: outcome.id,
          metricKey: seed.key,
          metricLabel: seed.label,
          unit: seed.unit ?? null,
          predictedValue:
            seed.predictedValue ?? null,
          confidence: seed.confidence ?? null,
          status: "PREDICTED",
          evidence:
            seed.evidence ??
            toInputJson({
              orchestrationRunId: run.id,
              nativeReferenceId:
                run.nativeReferenceId,
            }),
        })),
      });
    }

    created += 1;
  }

  return {
    scanned: runs.length,
    created,
  };
}

export async function observeClosedLoopMetric(input: {
  tenantId: string;
  userId: string;
  metricId: string;
  actualValue: number;
  evidenceNote: string | null;
}) {
  const metric =
    await prisma.closedLoopProcurementOutcomeMetric.findFirstOrThrow({
      where: {
        id: input.metricId,
        tenantId: input.tenantId,
      },
    });

  const varianceValue =
    metric.predictedValue === null
      ? null
      : input.actualValue -
        metric.predictedValue;

  const variancePercent =
    metric.predictedValue === null ||
    metric.predictedValue === 0
      ? null
      : ((input.actualValue -
          metric.predictedValue) /
          Math.abs(metric.predictedValue)) *
        100;

  const evidence =
    input.evidenceNote
      ? toInputJson({
          note: input.evidenceNote,
          observedAt: new Date().toISOString(),
        })
      : metric.evidence ?? undefined;

  const updated =
    await prisma.closedLoopProcurementOutcomeMetric.update({
      where: { id: metric.id },
      data: {
        actualValue: input.actualValue,
        varianceValue,
        variancePercent,
        status: "OBSERVED",
        observedByUserId: input.userId,
        observedAt: new Date(),
        evidence:
          evidence as Prisma.InputJsonValue | undefined,
      },
    });

  await prisma.closedLoopProcurementOutcome.update({
    where: { id: metric.outcomeId },
    data: {
      status: "OBSERVED",
      observedAt: new Date(),
      outcomeQuality: "OBSERVED",
    },
  });

  return updated;
}

export async function validateClosedLoopOutcome(input: {
  tenantId: string;
  userId: string;
  outcomeId: string;
  quality: string;
  note: string | null;
}) {
  const allowedQuality = new Set([
    "VALIDATED",
    "PARTIAL",
    "REJECTED",
  ]);

  if (!allowedQuality.has(input.quality)) {
    throw new Error(
      "Outcome quality must be VALIDATED, PARTIAL or REJECTED.",
    );
  }

  const outcome =
    await prisma.closedLoopProcurementOutcome.findFirstOrThrow({
      where: {
        id: input.outcomeId,
        tenantId: input.tenantId,
      },
    });

  return prisma.$transaction(async (tx) => {
    const updated =
      await tx.closedLoopProcurementOutcome.update({
        where: { id: outcome.id },
        data: {
          status:
            input.quality === "REJECTED"
              ? "REJECTED"
              : "VALIDATED",
          outcomeQuality: input.quality,
          validatedAt: new Date(),
          validatedByUserId: input.userId,
          validationNote: input.note,
        },
      });

    await tx.closedLoopProcurementOutcomeMetric.updateMany({
      where: {
        tenantId: input.tenantId,
        outcomeId: outcome.id,
        status: "OBSERVED",
      },
      data: {
        status:
          input.quality === "REJECTED"
            ? "REJECTED"
            : "VALIDATED",
      },
    });

    return updated;
  });
}

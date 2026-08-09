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

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function valuePayload(payload: Prisma.JsonValue) {
  const root = object(payload);
  const source = object(root.source);
  const proposed = object(root.proposed);
  const execution = object(root.executionPayload);

  const title =
    text(execution.title) ||
    text(execution.resourceLabel) ||
    text(source.sourceLabel) ||
    "Autonomous procurement value opportunity";

  const description =
    text(execution.description) ||
    text(execution.recommendation) ||
    "Human-governed autonomous procurement savings opportunity prepared for native value-realization qualification.";

  const estimatedSavings = Math.max(
    0,
    numeric(
      execution.estimatedSavingsUsd ??
        proposed.valueUsd ??
        execution.proposedValueUsd,
    ),
  );

  const exposure = Math.max(
    0,
    numeric(
      execution.estimatedExposureUsd ??
        execution.proposedValueUsd,
    ),
  );

  const confidence = clamp(
    numeric(execution.confidence) || 50,
    0,
    100,
  );

  return {
    title,
    description,
    estimatedSavings,
    exposure,
    confidence,
    resourceType: text(execution.resourceType) || null,
    resourceId: text(execution.resourceId) || null,
    resourceLabel:
      text(execution.resourceLabel) || title,
    recommendationId:
      text(execution.recommendationId) || null,
    recommendationSetId:
      text(execution.recommendationSetId) || null,
    recommendationType:
      text(execution.recommendationType) || null,
  };
}

export async function createNativeValueRealizationDraft(
  input: {
    tenantId: string;
    userId: string;
    nativeDraftId: string;
  },
) {
  const draft =
    await prisma.autonomousNativeWorkflowDraft.findFirstOrThrow({
      where: {
        id: input.nativeDraftId,
        tenantId: input.tenantId,
      },
    });

  if (draft.targetWorkflow !== "VALUE_REALIZATION") {
    throw new Error(
      "B10.4 only creates native Value Realization initiatives.",
    );
  }

  if (
    ![
      "DRAFT_MATERIALIZED",
      "NATIVE_WORKFLOW_OPENED",
    ].includes(draft.status)
  ) {
    if (
      draft.status === "NATIVE_RECORD_CREATED" &&
      draft.nativeReferenceId
    ) {
      return prisma.procurementValueInitiative.findFirstOrThrow({
        where: {
          id: draft.nativeReferenceId,
          tenantId: input.tenantId,
        },
      });
    }

    throw new Error(
      "This governed native draft is not eligible for Value Initiative creation.",
    );
  }

  if (draft.nativeReferenceId) {
    return prisma.procurementValueInitiative.findFirstOrThrow({
      where: {
        id: draft.nativeReferenceId,
        tenantId: input.tenantId,
      },
    });
  }

  const adapterJob =
    await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
      where: {
        id: draft.adapterJobId,
        tenantId: input.tenantId,
      },
    });

  if (
    ![
      "NATIVE_DRAFT_MATERIALIZED",
      "OPERATOR_ACTIVATED",
    ].includes(adapterJob.status)
  ) {
    throw new Error(
      "The source adapter job is not in an executable native-draft state.",
    );
  }

  const payload = valuePayload(draft.draftPayload);

  const count =
    await prisma.procurementValueInitiative.count({
      where: { tenantId: input.tenantId },
    });

  const initiativeNumber = `VAL-${new Date().getFullYear()}-${String(
    count + 1,
  ).padStart(6, "0")}`;

  const startsAt = new Date();
  const targetCompletionAt = addDays(startsAt, 180);

  const assumptions = [
    "The target benefit is an autonomous planning hypothesis and is not realized savings.",
    payload.recommendationId
      ? `Source recommendation: ${payload.recommendationId}.`
      : null,
    payload.recommendationSetId
      ? `Recommendation set: ${payload.recommendationSetId}.`
      : null,
    payload.resourceType
      ? `Resource type: ${payload.resourceType}.`
      : null,
    payload.resourceId
      ? `Resource ID: ${payload.resourceId}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const risks = [
    "Value must be validated through native procurement and finance governance.",
    "Forecast and realized benefits may differ materially from the autonomous estimate.",
    "No benefit is considered realized until supporting evidence and finance validation are completed.",
  ].join(" ");

  return prisma.$transaction(async (tx) => {
    const initiative =
      await tx.procurementValueInitiative.create({
        data: {
          tenantId: input.tenantId,
          initiativeNumber,
          title: payload.title.slice(0, 250),
          description: payload.description,
          category:
            payload.resourceType ?? "AUTONOMOUS_OPPORTUNITY",
          supplierId: null,
          sourcingEventId: null,
          contractId: null,
          ownerUserId: input.userId,
          financeOwnerUserId: null,
          executiveSponsorUserId: null,
          currencyCode: "USD",
          baselineAmount: payload.exposure,
          targetBenefitAmount:
            payload.estimatedSavings,
          forecastBenefitAmount:
            payload.estimatedSavings,
          probabilityPercent: payload.confidence,
          startsAt,
          targetCompletionAt,
          assumptions,
          risks,
          status: "QUALIFYING",
        },
      });

    const nativeUrl = "/app/value-realization";

    await tx.autonomousNativeWorkflowDraft.update({
      where: { id: draft.id },
      data: {
        status: "NATIVE_RECORD_CREATED",
        nativeReferenceId: initiative.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
        completionNote:
          "B10.4 created a native Procurement Value Initiative in QUALIFYING status. Benefit submission, evidence, finance validation and realization remain governed native actions.",
      },
    });

    await tx.autonomousExecutionAdapterJob.update({
      where: { id: adapterJob.id },
      data: {
        status: "COMPLETED",
        nativeReferenceType:
          "ProcurementValueInitiative",
        nativeReferenceId: initiative.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
      },
    });

    await tx.autonomousNativeWorkflowDraftDecision.create({
      data: {
        tenantId: input.tenantId,
        nativeDraftId: draft.id,
        decision:
          "NATIVE_VALUE_INITIATIVE_CREATED",
        decidedByUserId: input.userId,
        evidence: {
          initiativeId: initiative.id,
          initiativeNumber:
            initiative.initiativeNumber,
          status: initiative.status,
          targetBenefitAmount: Number(
            initiative.targetBenefitAmount,
          ),
          forecastBenefitAmount: Number(
            initiative.forecastBenefitAmount,
          ),
          realizedBenefitAmount: Number(
            initiative.realizedBenefitAmount,
          ),
          probabilityPercent: Number(
            initiative.probabilityPercent,
          ),
          sourceAdapterJobId: adapterJob.id,
          autonomousFinanceValidationPerformed: false,
          autonomousBenefitRealizationPerformed: false,
        },
      },
    });

    return initiative;
  });
}

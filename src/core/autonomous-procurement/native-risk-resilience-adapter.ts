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

function resiliencePayload(payload: Prisma.JsonValue) {
  const root = object(payload);
  const source = object(root.source);
  const proposed = object(root.proposed);
  const execution = object(root.executionPayload);

  const title =
    text(execution.title) ||
    text(execution.resourceLabel) ||
    text(source.sourceLabel) ||
    "Autonomous procurement risk mitigation";

  const description =
    text(execution.description) ||
    text(execution.recommendation) ||
    "Human-governed autonomous procurement recommendation prepared for native resilience planning.";

  const estimatedExposure = Math.max(
    0,
    numeric(
      execution.estimatedExposureUsd ??
        proposed.valueUsd ??
        execution.proposedValueUsd,
    ),
  );

  return {
    title,
    description,
    estimatedExposure,
    resourceType: text(execution.resourceType) || null,
    resourceId: text(execution.resourceId) || null,
    resourceLabel:
      text(execution.resourceLabel) || title,
    recommendationId:
      text(execution.recommendationId) || null,
    recommendationSetId:
      text(execution.recommendationSetId) || null,
  };
}

export async function createNativeRiskResilienceDraft(
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

  if (draft.targetWorkflow !== "RISK_MITIGATION") {
    throw new Error(
      "B10.3 only creates native Risk / Resilience drafts.",
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
      return prisma.resiliencePlan.findFirstOrThrow({
        where: {
          id: draft.nativeReferenceId,
          tenantId: input.tenantId,
        },
      });
    }

    throw new Error(
      "This governed native draft is not eligible for Resilience Plan creation.",
    );
  }

  if (draft.nativeReferenceId) {
    return prisma.resiliencePlan.findFirstOrThrow({
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

  const payload = resiliencePayload(draft.draftPayload);

  const activationCriteria = [
    "Human review confirms the modeled risk is actionable.",
    payload.estimatedExposure > 0
      ? `Modeled exposure: $${payload.estimatedExposure.toFixed(2)}.`
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

  const recoveryObjective = [
    "Reduce or contain the identified procurement/supply exposure while preserving continuity, compliance and approved service levels.",
    "Specific recovery actions, owners, dates and activation decisions must be completed in the native resilience workspace.",
  ].join(" ");

  return prisma.$transaction(async (tx) => {
    const plan = await tx.resiliencePlan.create({
      data: {
        tenantId: input.tenantId,
        supplyRiskEventId: null,
        name: payload.title.slice(0, 250),
        description: payload.description,
        status: "DRAFT",
        ownerUserId: input.userId,
        activationCriteria,
        recoveryObjective,
        recoveryTimeHours: null,
        minimumServicePercent: 50,
        alternateSuppliers: [],
        alternateSites: [],
        inventoryStrategy:
          "Review safety stock, alternate inventory positions, allocation and replenishment options before activation.",
        logisticsStrategy:
          "Review alternate lanes, carriers, lead-time buffers and continuity routes before activation.",
        communicationsPlan:
          "Confirm stakeholders, escalation thresholds and communications cadence before activation.",
      },
    });

    const nativeUrl = "/app/resilience";

    await tx.autonomousNativeWorkflowDraft.update({
      where: { id: draft.id },
      data: {
        status: "NATIVE_RECORD_CREATED",
        nativeReferenceId: plan.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
        completionNote:
          "B10.3 created a native Resilience Plan in DRAFT status. Activation and operational response remain governed native actions.",
      },
    });

    await tx.autonomousExecutionAdapterJob.update({
      where: { id: adapterJob.id },
      data: {
        status: "COMPLETED",
        nativeReferenceType: "ResiliencePlan",
        nativeReferenceId: plan.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
      },
    });

    await tx.autonomousNativeWorkflowDraftDecision.create({
      data: {
        tenantId: input.tenantId,
        nativeDraftId: draft.id,
        decision: "NATIVE_RESILIENCE_PLAN_CREATED",
        decidedByUserId: input.userId,
        evidence: {
          resiliencePlanId: plan.id,
          status: plan.status,
          sourceAdapterJobId: adapterJob.id,
          recommendationId:
            payload.recommendationId,
          recommendationSetId:
            payload.recommendationSetId,
          modeledExposureUsd:
            payload.estimatedExposure,
          autonomousActivationPerformed: false,
          autonomousClosurePerformed: false,
        },
      },
    });

    return plan;
  });
}

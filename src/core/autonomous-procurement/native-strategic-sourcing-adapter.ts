import crypto from "node:crypto";
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

function eventNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  return `ASR-${date}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function sourcingPayload(payload: Prisma.JsonValue) {
  const root = object(payload);
  const source = object(root.source);
  const proposed = object(root.proposed);
  const execution = object(root.executionPayload);

  const title =
    text(execution.title) ||
    text(execution.resourceLabel) ||
    text(source.sourceLabel) ||
    "Autonomous strategic sourcing opportunity";

  const description =
    text(execution.description) ||
    text(execution.recommendation) ||
    "Human-governed autonomous procurement recommendation prepared for native strategic sourcing.";

  const estimatedValue = Math.max(
    0,
    numeric(
      proposed.valueUsd ??
        execution.estimatedExposureUsd ??
        execution.estimatedSavingsUsd ??
        execution.proposedValueUsd,
    ),
  );

  return {
    title,
    description,
    estimatedValue,
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

export async function createNativeStrategicSourcingDraft(
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

  if (draft.targetWorkflow !== "STRATEGIC_SOURCING") {
    throw new Error(
      "B10.2 only creates native Strategic Sourcing event drafts.",
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
      return prisma.sourcingEvent.findFirstOrThrow({
        where: {
          id: draft.nativeReferenceId,
          tenantId: input.tenantId,
        },
      });
    }

    throw new Error(
      "This governed native draft is not eligible for Sourcing Event creation.",
    );
  }

  if (draft.nativeReferenceId) {
    return prisma.sourcingEvent.findFirstOrThrow({
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

  const payload = sourcingPayload(draft.draftPayload);

  const summary = [
    payload.description,
    payload.recommendationId
      ? `Recommendation: ${payload.recommendationId}.`
      : null,
    payload.recommendationSetId
      ? `Recommendation set: ${payload.recommendationSetId}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const scopeOfWork = [
    `Strategic sourcing scope: ${payload.resourceLabel}.`,
    payload.resourceType
      ? `Resource type: ${payload.resourceType}.`
      : null,
    payload.resourceId
      ? `Resource ID: ${payload.resourceId}.`
      : null,
    "This draft was created from a human-governed autonomous procurement handoff. Commercial requirements, supplier eligibility, evaluation criteria, dates and award governance must be completed in the native sourcing workspace before publication.",
  ]
    .filter(Boolean)
    .join(" ");

  return prisma.$transaction(async (tx) => {
    const event = await tx.sourcingEvent.create({
      data: {
        tenantId: input.tenantId,
        eventNumber: eventNumber(),
        type: "RFP",
        status: "DRAFT",
        title: payload.title.slice(0, 250),
        summary,
        scopeOfWork,
        currencyCode: "USD",
        estimatedValue:
          payload.estimatedValue > 0
            ? payload.estimatedValue
            : null,
        sealedResponses: true,
        allowMultipleRounds: false,
        currentRound: 1,
      },
    });

    const nativeUrl = `/app/sourcing/${event.id}`;

    await tx.autonomousNativeWorkflowDraft.update({
      where: { id: draft.id },
      data: {
        status: "NATIVE_RECORD_CREATED",
        nativeReferenceId: event.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
        completionNote:
          "B10.2 created a native Sourcing Event in DRAFT status. Publication, supplier invitation, evaluation and award remain governed native actions.",
      },
    });

    await tx.autonomousExecutionAdapterJob.update({
      where: { id: adapterJob.id },
      data: {
        status: "COMPLETED",
        nativeReferenceType: "SourcingEvent",
        nativeReferenceId: event.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
      },
    });

    await tx.autonomousNativeWorkflowDraftDecision.create({
      data: {
        tenantId: input.tenantId,
        nativeDraftId: draft.id,
        decision: "NATIVE_SOURCING_EVENT_CREATED",
        decidedByUserId: input.userId,
        evidence: {
          sourcingEventId: event.id,
          eventNumber: event.eventNumber,
          type: event.type,
          status: event.status,
          estimatedValue:
            event.estimatedValue === null
              ? null
              : Number(event.estimatedValue),
          sealedResponses: event.sealedResponses,
          sourceAdapterJobId: adapterJob.id,
          autonomousPublicationPerformed: false,
          autonomousSupplierInvitationPerformed: false,
          autonomousAwardPerformed: false,
        },
      },
    });

    return event;
  });
}

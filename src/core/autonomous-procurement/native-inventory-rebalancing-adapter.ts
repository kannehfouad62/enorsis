import { Prisma } from "@/generated/prisma/client";
import { createInventoryMovement } from "@/core/inventory-operations/service";
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

function positive(value: unknown, fallback = 1) {
  const parsed = numeric(value);
  return parsed > 0 ? parsed : fallback;
}

function inventoryPayload(payload: Prisma.JsonValue) {
  const root = object(payload);
  const source = object(root.source);
  const proposed = object(root.proposed);
  const execution = object(root.executionPayload);

  const inventoryItemId =
    text(execution.inventoryItemId) ||
    text(execution.resourceId) ||
    text(source.sourceId);

  const quantity = positive(
    proposed.quantity ??
      execution.proposedQuantity ??
      execution.recommendedQuantity,
    1,
  );

  const proposedValue = Math.max(
    0,
    numeric(
      proposed.valueUsd ??
        execution.proposedValueUsd ??
        execution.estimatedExposureUsd,
    ),
  );

  const unitCost =
    proposedValue > 0 && quantity > 0
      ? proposedValue / quantity
      : null;

  const fromLocationId =
    text(execution.fromLocationId) ||
    text(execution.sourceLocationId) ||
    null;

  const toLocationId =
    text(execution.toLocationId) ||
    text(execution.destinationLocationId) ||
    null;

  const resourceLabel =
    text(execution.resourceLabel) ||
    text(source.sourceLabel) ||
    "Autonomous inventory rebalancing";

  const recommendation =
    text(execution.recommendation) ||
    text(execution.description) ||
    "Human-governed autonomous inventory rebalancing recommendation.";

  return {
    inventoryItemId,
    quantity,
    proposedValue,
    unitCost,
    fromLocationId,
    toLocationId,
    resourceLabel,
    recommendation,
    resourceType: text(execution.resourceType) || null,
    sourcePlanId: text(execution.sourcePlanId) || null,
    sourcePlanActionId:
      text(execution.sourcePlanActionId) || null,
  };
}

export async function createNativeInventoryRebalancingDraft(
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

  if (draft.targetWorkflow !== "INVENTORY_REBALANCE") {
    throw new Error(
      "B10.5 only creates native Inventory Rebalancing movement drafts.",
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
      return prisma.inventoryMovementLedger.findFirstOrThrow({
        where: {
          id: draft.nativeReferenceId,
          tenantId: input.tenantId,
        },
      });
    }

    throw new Error(
      "This governed native draft is not eligible for Inventory Movement creation.",
    );
  }

  if (draft.nativeReferenceId) {
    return prisma.inventoryMovementLedger.findFirstOrThrow({
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

  const payload = inventoryPayload(draft.draftPayload);

  if (!payload.inventoryItemId) {
    throw new Error(
      "The governed inventory draft does not contain an inventory item identifier.",
    );
  }

  const reason = [
    "Human-governed autonomous inventory rebalancing draft.",
    payload.recommendation,
    payload.sourcePlanId
      ? `Source plan: ${payload.sourcePlanId}.`
      : null,
    payload.sourcePlanActionId
      ? `Source plan action: ${payload.sourcePlanActionId}.`
      : null,
    !payload.fromLocationId || !payload.toLocationId
      ? "Source and destination locations must be reviewed and completed before posting."
      : "Source and destination locations were proposed by the governed execution payload and must still be validated before posting.",
  ]
    .filter(Boolean)
    .join(" ");

  const movement = await createInventoryMovement({
    tenantId: input.tenantId,
    movementType: "TRANSFER",
    inventoryItemId: payload.inventoryItemId,
    fromLocationId: payload.fromLocationId,
    toLocationId: payload.toLocationId,
    quantity: payload.quantity,
    unitOfMeasure: "EA",
    unitCost: payload.unitCost,
    currencyCode: "USD",
    referenceType: "AUTONOMOUS_NATIVE_DRAFT",
    referenceId: draft.id,
    serialLotReference: null,
    reason,
    actorUserId: input.userId,
  });

  const nativeUrl = "/app/inventory-operations";

  await prisma.$transaction(async (tx) => {
    await tx.autonomousNativeWorkflowDraft.update({
      where: { id: draft.id },
      data: {
        status: "NATIVE_RECORD_CREATED",
        nativeReferenceId: movement.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
        completionNote:
          "B10.5 created a native Inventory Movement TRANSFER in DRAFT status. No inventory quantities were changed; posting remains a separate governed native action.",
      },
    });

    await tx.autonomousExecutionAdapterJob.update({
      where: { id: adapterJob.id },
      data: {
        status: "COMPLETED",
        nativeReferenceType: "InventoryMovementLedger",
        nativeReferenceId: movement.id,
        nativeReferenceUrl: nativeUrl,
        completedByUserId: input.userId,
        completedAt: new Date(),
      },
    });

    await tx.autonomousNativeWorkflowDraftDecision.create({
      data: {
        tenantId: input.tenantId,
        nativeDraftId: draft.id,
        decision: "NATIVE_INVENTORY_TRANSFER_CREATED",
        decidedByUserId: input.userId,
        evidence: {
          inventoryMovementId: movement.id,
          movementNumber: movement.movementNumber,
          movementType: movement.movementType,
          status: movement.status,
          inventoryItemId: movement.inventoryItemId,
          quantity: Number(movement.quantity),
          fromLocationId: movement.fromLocationId,
          toLocationId: movement.toLocationId,
          sourceAdapterJobId: adapterJob.id,
          autonomousPostingPerformed: false,
          inventoryQuantityChanged: false,
        },
      },
    });
  });

  return movement;
}

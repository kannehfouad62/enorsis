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

function positive(value: unknown, fallback = 1) {
  const parsed = numeric(value);
  return parsed > 0 ? parsed : fallback;
}

function requestNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  return `APR-${date}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function purchaseRequestPayload(payload: Prisma.JsonValue) {
  const root = object(payload);
  const source = object(root.source);
  const proposed = object(root.proposed);
  const execution = object(root.executionPayload);

  const quantity = positive(
    proposed.quantity ?? execution.proposedQuantity,
    1,
  );

  const total = Math.max(
    0,
    numeric(
      proposed.valueUsd ?? execution.proposedValueUsd,
    ),
  );

  const unitPrice =
    quantity > 0 ? total / quantity : total;

  const resourceLabel =
    text(execution.resourceLabel) ||
    text(source.sourceLabel) ||
    "Autonomous procurement requirement";

  const recommendation =
    text(execution.recommendation) ||
    "Generated from a human-governed autonomous procurement execution envelope.";

  const supplierId =
    text(proposed.supplierId) ||
    text(execution.proposedSupplierId) ||
    null;

  return {
    quantity,
    total,
    unitPrice,
    resourceLabel,
    recommendation,
    supplierId,
    resourceId: text(execution.resourceId) || null,
    resourceType: text(execution.resourceType) || null,
    sourcePlanId: text(execution.sourcePlanId) || null,
    sourcePlanActionId:
      text(execution.sourcePlanActionId) || null,
  };
}

export async function createNativePurchaseRequestDraft(
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

  if (draft.targetWorkflow !== "PURCHASE_REQUEST") {
    throw new Error(
      "B10.1 only creates native Purchase Request drafts.",
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
      return prisma.purchaseRequest.findFirstOrThrow({
        where: {
          id: draft.nativeReferenceId,
          tenantId: input.tenantId,
        },
        include: { lines: true },
      });
    }

    throw new Error(
      "This governed native draft is not eligible for Purchase Request creation.",
    );
  }

  if (draft.nativeReferenceId) {
    return prisma.purchaseRequest.findFirstOrThrow({
      where: {
        id: draft.nativeReferenceId,
        tenantId: input.tenantId,
      },
      include: { lines: true },
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

  const payload = purchaseRequestPayload(
    draft.draftPayload,
  );

  const title = payload.resourceLabel.slice(0, 250);

  const businessJustification = [
    "Human-governed autonomous procurement draft.",
    payload.recommendation,
    payload.sourcePlanId
      ? `Source plan: ${payload.sourcePlanId}.`
      : null,
    payload.sourcePlanActionId
      ? `Source plan action: ${payload.sourcePlanActionId}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const created = await prisma.$transaction(
    async (tx) => {
      const purchaseRequest =
        await tx.purchaseRequest.create({
          data: {
            tenantId: input.tenantId,
            requesterId: input.userId,
            requestNumber: requestNumber(),
            title,
            businessJustification,
            priority: "NORMAL",
            status: "DRAFT",
            originalCurrency: "USD",
            totalAmount: payload.total,
            usdEquivalent: payload.total,
            exchangeRateToUsd: 1,
            exchangeRateSource:
              "AUTONOMOUS_NATIVE_ADAPTER",
            exchangeRateDate: new Date(),
            lines: {
              create: [
                {
                  lineNumber: 1,
                  description: payload.resourceLabel,
                  category:
                    payload.resourceType ?? undefined,
                  quantity: payload.quantity,
                  unitOfMeasure: "EA",
                  unitPrice: payload.unitPrice,
                  lineTotal: payload.total,
                  supplierSuggestion:
                    payload.supplierId ?? undefined,
                },
              ],
            },
          },
          include: { lines: true },
        });

      const nativeUrl = `/app/requests/${purchaseRequest.id}`;

      await tx.autonomousNativeWorkflowDraft.update({
        where: { id: draft.id },
        data: {
          status: "NATIVE_RECORD_CREATED",
          nativeReferenceId: purchaseRequest.id,
          nativeReferenceUrl: nativeUrl,
          completedByUserId: input.userId,
          completedAt: new Date(),
          completionNote:
            "B10.1 created a native Purchase Request in DRAFT status. Native submission and approvals remain required.",
        },
      });

      await tx.autonomousExecutionAdapterJob.update({
        where: { id: adapterJob.id },
        data: {
          status: "COMPLETED",
          nativeReferenceType: "PurchaseRequest",
          nativeReferenceId: purchaseRequest.id,
          nativeReferenceUrl: nativeUrl,
          completedByUserId: input.userId,
          completedAt: new Date(),
        },
      });

      await tx.autonomousNativeWorkflowDraftDecision.create({
        data: {
          tenantId: input.tenantId,
          nativeDraftId: draft.id,
          decision: "NATIVE_PURCHASE_REQUEST_CREATED",
          decidedByUserId: input.userId,
          evidence: {
            purchaseRequestId: purchaseRequest.id,
            requestNumber:
              purchaseRequest.requestNumber,
            status: purchaseRequest.status,
            totalAmount: Number(
              purchaseRequest.totalAmount,
            ),
            lineCount: purchaseRequest.lines.length,
            sourceAdapterJobId: adapterJob.id,
            autonomousSubmissionPerformed: false,
            autonomousApprovalPerformed: false,
          },
        },
      });

      return purchaseRequest;
    },
  );

  return created;
}

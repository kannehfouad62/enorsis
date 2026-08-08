import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AdapterDefinition = {
  adapterKey: string;
  nativeRoute: string;
  nativeReferenceType: string;
  activationMode: "OPERATOR_DRAFT";
};

const adapters: Record<string, AdapterDefinition> = {
  PURCHASE_REQUEST: {
    adapterKey: "purchase-request-draft-v1",
    nativeRoute: "/app/requisition-to-order/purchase-request",
    nativeReferenceType: "PurchaseRequest",
    activationMode: "OPERATOR_DRAFT",
  },
  STRATEGIC_SOURCING: {
    adapterKey: "strategic-sourcing-draft-v1",
    nativeRoute: "/app/sourcing",
    nativeReferenceType: "SourcingEvent",
    activationMode: "OPERATOR_DRAFT",
  },
  INVENTORY_REBALANCE: {
    adapterKey: "inventory-rebalance-draft-v1",
    nativeRoute: "/app/inventory-operations",
    nativeReferenceType: "InventoryAction",
    activationMode: "OPERATOR_DRAFT",
  },
  RISK_MITIGATION: {
    adapterKey: "risk-mitigation-draft-v1",
    nativeRoute: "/app/resilience",
    nativeReferenceType: "RiskAction",
    activationMode: "OPERATOR_DRAFT",
  },
  VALUE_REALIZATION: {
    adapterKey: "value-realization-draft-v1",
    nativeRoute: "/app/value-realization",
    nativeReferenceType: "ValueRealizationAction",
    activationMode: "OPERATOR_DRAFT",
  },
  GOVERNED_REVIEW: {
    adapterKey: "governed-review-draft-v1",
    nativeRoute: "/app/reviews",
    nativeReferenceType: "GovernedReview",
    activationMode: "OPERATOR_DRAFT",
  },
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function idempotencyKey(input: {
  tenantId: string;
  handoffId: string;
  targetWorkflow: string;
}) {
  return crypto
    .createHash("sha256")
    .update(
      [
        input.tenantId,
        input.handoffId,
        input.targetWorkflow,
        "B9.4",
      ].join(":"),
    )
    .digest("hex");
}

export function getAdapterDefinition(
  targetWorkflow: string,
) {
  return adapters[targetWorkflow] ?? null;
}

export async function prepareAdapterJob(input: {
  tenantId: string;
  userId: string;
  handoffId: string;
}) {
  const handoff =
    await prisma.autonomousExecutionHandoff.findFirstOrThrow({
      where: {
        id: input.handoffId,
        tenantId: input.tenantId,
      },
    });

  if (handoff.status !== "READY_FOR_HANDOFF") {
    throw new Error(
      "Only READY_FOR_HANDOFF records can be prepared for a native workflow adapter.",
    );
  }

  const definition = getAdapterDefinition(
    handoff.targetWorkflow,
  );

  if (!definition) {
    throw new Error(
      `No controlled adapter is registered for ${handoff.targetWorkflow}.`,
    );
  }

  const envelope =
    await prisma.autonomousExecutionEnvelope.findFirstOrThrow({
      where: {
        id: handoff.executionEnvelopeId,
        tenantId: input.tenantId,
        status: "RELEASED",
      },
    });

  const key = idempotencyKey({
    tenantId: input.tenantId,
    handoffId: handoff.id,
    targetWorkflow: handoff.targetWorkflow,
  });

  const existing =
    await prisma.autonomousExecutionAdapterJob.findFirst({
      where: {
        tenantId: input.tenantId,
        idempotencyKey: key,
      },
    });

  if (existing) return existing;

  const draftPayload: Prisma.InputJsonValue = {
    source: {
      executionHandoffId: handoff.id,
      executionEnvelopeId: envelope.id,
      sourceType: envelope.sourceType,
      sourceId: envelope.sourceId,
      sourceLabel: envelope.sourceLabel,
    },
    target: {
      workflow: handoff.targetWorkflow,
      nativeRoute: definition.nativeRoute,
      nativeReferenceType:
        definition.nativeReferenceType,
    },
    proposed: {
      valueUsd:
        envelope.proposedValueUsd === null
          ? null
          : Number(envelope.proposedValueUsd),
      quantity:
        envelope.proposedQuantity === null
          ? null
          : Number(envelope.proposedQuantity),
      supplierId: envelope.proposedSupplierId,
      executionType: envelope.executionType,
    },
    executionPayload: toInputJson(
      envelope.executionPayload,
    ),
    governance: {
      releasedByUserId: envelope.releasedByUserId,
      releasedAt: envelope.releasedAt?.toISOString() ?? null,
      humanReleaseRequired: true,
      transactionCreationMode: "OPERATOR_DRAFT",
      bypassNativeApproval: false,
    },
  };

  return prisma.autonomousExecutionAdapterJob.create({
    data: {
      tenantId: input.tenantId,
      executionHandoffId: handoff.id,
      executionEnvelopeId: envelope.id,
      targetWorkflow: handoff.targetWorkflow,
      adapterKey: definition.adapterKey,
      nativeRoute: definition.nativeRoute,
      status: "DRAFT_READY",
      idempotencyKey: key,
      draftPayload,
      validationSnapshot: {
        handoffStatus: handoff.status,
        envelopeStatus: envelope.status,
        adapterRegistered: true,
        nativeApprovalBypass: false,
        activationMode: definition.activationMode,
      },
      nativeReferenceType:
        definition.nativeReferenceType,
      createdByUserId: input.userId,
    },
  });
}

export async function activateAdapterJob(input: {
  tenantId: string;
  userId: string;
  adapterJobId: string;
  reason: string | null;
}) {
  const job =
    await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
      where: {
        id: input.adapterJobId,
        tenantId: input.tenantId,
      },
    });

  if (job.status !== "DRAFT_READY") {
    throw new Error(
      "Only DRAFT_READY adapter jobs can be activated.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated =
      await tx.autonomousExecutionAdapterJob.update({
        where: { id: job.id },
        data: {
          status: "OPERATOR_ACTIVATED",
          activatedByUserId: input.userId,
          activatedAt: new Date(),
          nativeReferenceUrl: job.nativeRoute,
        },
      });

    await tx.autonomousExecutionAdapterDecision.create({
      data: {
        tenantId: input.tenantId,
        adapterJobId: job.id,
        decision: "ACTIVATED",
        decidedByUserId: input.userId,
        reason: input.reason,
        evidence: {
          nativeRoute: job.nativeRoute,
          adapterKey: job.adapterKey,
          nativeTransactionCreated: false,
          nativeApprovalBypass: false,
          nextStep:
            "Open the native Enorsis workflow and create/review its draft using the staged payload.",
        },
      },
    });

    return updated;
  });
}

export async function cancelAdapterJob(input: {
  tenantId: string;
  userId: string;
  adapterJobId: string;
  reason: string | null;
}) {
  const job =
    await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
      where: {
        id: input.adapterJobId,
        tenantId: input.tenantId,
      },
    });

  if (
    !["DRAFT_READY", "OPERATOR_ACTIVATED"].includes(
      job.status,
    )
  ) {
    throw new Error(
      "This adapter job can no longer be cancelled.",
    );
  }

  return prisma.$transaction([
    prisma.autonomousExecutionAdapterJob.update({
      where: { id: job.id },
      data: {
        status: "CANCELLED",
        failureReason: input.reason,
      },
    }),
    prisma.autonomousExecutionAdapterDecision.create({
      data: {
        tenantId: input.tenantId,
        adapterJobId: job.id,
        decision: "CANCELLED",
        decidedByUserId: input.userId,
        reason: input.reason,
        evidence: {
          priorStatus: job.status,
          nativeTransactionCreated: false,
        },
      },
    }),
  ]);
}

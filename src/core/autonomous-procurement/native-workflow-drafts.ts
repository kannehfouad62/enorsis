import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function draftTitle(targetWorkflow: string, referenceType: string) {
  return `${targetWorkflow.replaceAll("_", " ")} · ${referenceType} draft`;
}

function validatePayload(input: {
  targetWorkflow: string;
  payload: unknown;
  nativeRoute: string;
}) {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!input.nativeRoute.startsWith("/app/")) {
    failures.push("Native route must resolve inside the authenticated Enorsis application.");
  }

  if (
    input.payload === null ||
    input.payload === undefined ||
    typeof input.payload !== "object"
  ) {
    failures.push("Adapter draft payload is missing or invalid.");
  }

  if (input.targetWorkflow === "PURCHASE_REQUEST") {
    warnings.push(
      "Native purchase-request validation, accounting, approval routing and line-item completion remain mandatory.",
    );
  }

  if (input.targetWorkflow === "STRATEGIC_SOURCING") {
    warnings.push(
      "Sourcing-event type, dates, suppliers, commercial requirements and governance must be completed in the native sourcing workspace.",
    );
  }

  if (input.targetWorkflow === "INVENTORY_REBALANCE") {
    warnings.push(
      "Source/destination inventory locations and quantity availability must be confirmed in the native inventory workflow.",
    );
  }

  if (input.targetWorkflow === "RISK_MITIGATION") {
    warnings.push(
      "Risk owner, due date, mitigation controls and approval requirements must be confirmed in the native resilience workflow.",
    );
  }

  if (input.targetWorkflow === "VALUE_REALIZATION") {
    warnings.push(
      "Savings baseline, finance validation and realization evidence remain required in the native value-realization workflow.",
    );
  }

  return {
    valid: failures.length === 0,
    failures,
    warnings,
  };
}

export async function materializeNativeWorkflowDraft(input: {
  tenantId: string;
  userId: string;
  adapterJobId: string;
}) {
  const job =
    await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
      where: {
        id: input.adapterJobId,
        tenantId: input.tenantId,
      },
    });

  if (job.status !== "OPERATOR_ACTIVATED") {
    throw new Error(
      "Only OPERATOR_ACTIVATED adapter jobs can be materialized as governed native drafts.",
    );
  }

  const existing =
    await prisma.autonomousNativeWorkflowDraft.findFirst({
      where: {
        tenantId: input.tenantId,
        adapterJobId: job.id,
      },
    });

  if (existing) return existing;

  const validation = validatePayload({
    targetWorkflow: job.targetWorkflow,
    payload: job.draftPayload,
    nativeRoute: job.nativeRoute,
  });

  if (!validation.valid) {
    throw new Error(
      `Native draft validation failed: ${validation.failures.join("; ")}`,
    );
  }

  const draft =
    await prisma.autonomousNativeWorkflowDraft.create({
      data: {
        tenantId: input.tenantId,
        adapterJobId: job.id,
        executionHandoffId: job.executionHandoffId,
        targetWorkflow: job.targetWorkflow,
        nativeReferenceType:
          job.nativeReferenceType ?? "NativeWorkflowRecord",
        nativeRoute: job.nativeRoute,
        status: "DRAFT_MATERIALIZED",
        draftTitle: draftTitle(
          job.targetWorkflow,
          job.nativeReferenceType ?? "NativeWorkflowRecord",
        ),
        draftPayload: toInputJson(job.draftPayload),
        validationSnapshot: {
          valid: validation.valid,
          failures: validation.failures,
          warnings: validation.warnings,
          nativeApprovalBypass: false,
          directDatabaseCreation: false,
          operatorConfirmationRequired: true,
        },
        requiresNativeReview: true,
        createdByUserId: input.userId,
      },
    });

  await prisma.autonomousExecutionAdapterJob.update({
    where: { id: job.id },
    data: { status: "NATIVE_DRAFT_MATERIALIZED" },
  });

  return draft;
}

export async function openNativeDraft(input: {
  tenantId: string;
  userId: string;
  nativeDraftId: string;
}) {
  const draft =
    await prisma.autonomousNativeWorkflowDraft.findFirstOrThrow({
      where: {
        id: input.nativeDraftId,
        tenantId: input.tenantId,
      },
    });

  if (!["DRAFT_MATERIALIZED", "NATIVE_WORKFLOW_OPENED"].includes(draft.status)) {
    throw new Error(
      "This governed native draft cannot be opened in its current status.",
    );
  }

  const updated =
    await prisma.autonomousNativeWorkflowDraft.update({
      where: { id: draft.id },
      data: {
        status: "NATIVE_WORKFLOW_OPENED",
        openedByUserId: input.userId,
        openedAt: draft.openedAt ?? new Date(),
      },
    });

  await prisma.autonomousNativeWorkflowDraftDecision.create({
    data: {
      tenantId: input.tenantId,
      nativeDraftId: draft.id,
      decision: "OPENED_NATIVE_WORKFLOW",
      decidedByUserId: input.userId,
      evidence: {
        nativeRoute: draft.nativeRoute,
        nativeReferenceType: draft.nativeReferenceType,
        nativeTransactionCreatedByB95: false,
      },
    },
  });

  return updated;
}

export async function completeNativeDraft(input: {
  tenantId: string;
  userId: string;
  nativeDraftId: string;
  nativeReferenceId: string;
  nativeReferenceUrl: string | null;
  note: string | null;
}) {
  const draft =
    await prisma.autonomousNativeWorkflowDraft.findFirstOrThrow({
      where: {
        id: input.nativeDraftId,
        tenantId: input.tenantId,
      },
    });

  if (!["DRAFT_MATERIALIZED", "NATIVE_WORKFLOW_OPENED"].includes(draft.status)) {
    throw new Error(
      "Only active governed native drafts can be completed.",
    );
  }

  if (!input.nativeReferenceId.trim()) {
    throw new Error(
      "A native Enorsis record reference is required before completing the handoff.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated =
      await tx.autonomousNativeWorkflowDraft.update({
        where: { id: draft.id },
        data: {
          status: "NATIVE_DRAFT_CONFIRMED",
          nativeReferenceId: input.nativeReferenceId.trim(),
          nativeReferenceUrl:
            input.nativeReferenceUrl?.trim() || null,
          completedByUserId: input.userId,
          completedAt: new Date(),
          completionNote: input.note,
        },
      });

    await tx.autonomousExecutionAdapterJob.update({
      where: { id: draft.adapterJobId },
      data: {
        status: "COMPLETED",
        nativeReferenceId: input.nativeReferenceId.trim(),
        nativeReferenceUrl:
          input.nativeReferenceUrl?.trim() || draft.nativeRoute,
        completedByUserId: input.userId,
        completedAt: new Date(),
      },
    });

    await tx.autonomousNativeWorkflowDraftDecision.create({
      data: {
        tenantId: input.tenantId,
        nativeDraftId: draft.id,
        decision: "NATIVE_DRAFT_CONFIRMED",
        decidedByUserId: input.userId,
        reason: input.note,
        evidence: {
          nativeReferenceId: input.nativeReferenceId.trim(),
          nativeReferenceUrl:
            input.nativeReferenceUrl?.trim() || null,
          directDatabaseCreationByB95: false,
          nativeApprovalBypass: false,
        },
      },
    });

    return updated;
  });
}

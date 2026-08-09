import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { prepareAdapterJob } from "@/core/autonomous-procurement/transaction-adapters";
import { materializeNativeWorkflowDraft } from "@/core/autonomous-procurement/native-workflow-drafts";
import { createNativePurchaseRequestDraft } from "@/core/autonomous-procurement/native-purchase-request-adapter";
import { createNativeStrategicSourcingDraft } from "@/core/autonomous-procurement/native-strategic-sourcing-adapter";
import { createNativeRiskResilienceDraft } from "@/core/autonomous-procurement/native-risk-resilience-adapter";
import { createNativeValueRealizationDraft } from "@/core/autonomous-procurement/native-value-realization-adapter";
import { createNativeInventoryRebalancingDraft } from "@/core/autonomous-procurement/native-inventory-rebalancing-adapter";

const RETRY_MINUTES = 15;
const MAX_ATTEMPTS = 8;

function retryAt() {
  return new Date(Date.now() + RETRY_MINUTES * 60_000);
}

async function event(input: {
  tenantId: string;
  runId: string;
  eventType: string;
  fromStage?: string | null;
  toStage?: string | null;
  actorUserId?: string | null;
  message?: string | null;
  evidence?: Record<string, unknown>;
}) {
  await prisma.autonomousProcurementOrchestrationEvent.create({
    data: {
      tenantId: input.tenantId,
      orchestrationRunId: input.runId,
      eventType: input.eventType,
      fromStage: input.fromStage ?? null,
      toStage: input.toStage ?? null,
      actorUserId: input.actorUserId ?? null,
      message: input.message ?? null,
      evidence: (input.evidence ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function move(input: {
  runId: string;
  tenantId: string;
  fromStage: string;
  toStage: string;
  status: string;
  actorUserId?: string | null;
  message?: string;
  data?: Record<string, unknown>;
}) {
  await prisma.autonomousProcurementOrchestrationRun.update({
    where: { id: input.runId },
    data: {
      stage: input.toStage,
      status: input.status,
      pauseReason: null,
      lastError: null,
      nextAttemptAt: null,
      ...(input.data ?? {}),
    },
  });

  await event({
    tenantId: input.tenantId,
    runId: input.runId,
    eventType: "STAGE_TRANSITION",
    fromStage: input.fromStage,
    toStage: input.toStage,
    actorUserId: input.actorUserId,
    message: input.message,
  });
}

async function pause(input: {
  runId: string;
  tenantId: string;
  stage: string;
  reason: string;
  actorUserId?: string | null;
}) {
  await prisma.autonomousProcurementOrchestrationRun.update({
    where: { id: input.runId },
    data: {
      status: "PAUSED",
      pauseReason: input.reason,
      nextAttemptAt: null,
    },
  });

  await event({
    tenantId: input.tenantId,
    runId: input.runId,
    eventType: "HUMAN_GATE_WAIT",
    fromStage: input.stage,
    toStage: input.stage,
    actorUserId: input.actorUserId,
    message: input.reason,
  });
}

export async function discoverReleasedAutonomousHandoffs() {
  const handoffs =
    await prisma.autonomousExecutionHandoff.findMany({
      where: {
        status: "READY_FOR_HANDOFF",
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

  let created = 0;

  for (const handoff of handoffs) {
    const existing =
      await prisma.autonomousProcurementOrchestrationRun.findFirst({
        where: {
          tenantId: handoff.tenantId,
          executionHandoffId: handoff.id,
        },
        select: { id: true },
      });

    if (existing) continue;

    const run =
      await prisma.autonomousProcurementOrchestrationRun.create({
        data: {
          tenantId: handoff.tenantId,
          executionHandoffId: handoff.id,
          executionEnvelopeId: handoff.executionEnvelopeId,
          targetWorkflow: handoff.targetWorkflow,
          status: "READY",
          stage: "RELEASED_HANDOFF",
        },
      });

    await event({
      tenantId: handoff.tenantId,
      runId: run.id,
      eventType: "ORCHESTRATION_DISCOVERED",
      toStage: "RELEASED_HANDOFF",
      message:
        "Discovered a human-released autonomous execution handoff.",
      evidence: {
        executionHandoffId: handoff.id,
        targetWorkflow: handoff.targetWorkflow,
      },
    });

    created += 1;
  }

  return created;
}

async function createNativeRecord(input: {
  tenantId: string;
  userId: string;
  nativeDraftId: string;
  targetWorkflow: string;
}) {
  switch (input.targetWorkflow) {
    case "PURCHASE_REQUEST":
      return createNativePurchaseRequestDraft(input);
    case "STRATEGIC_SOURCING":
      return createNativeStrategicSourcingDraft(input);
    case "RISK_MITIGATION":
      return createNativeRiskResilienceDraft(input);
    case "VALUE_REALIZATION":
      return createNativeValueRealizationDraft(input);
    case "INVENTORY_REBALANCE":
      return createNativeInventoryRebalancingDraft(input);
    default:
      return null;
  }
}

export async function processAutonomousOrchestrationRun(
  runId: string,
) {
  let run =
    await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
      where: { id: runId },
    });

  if (["COMPLETED", "CANCELLED"].includes(run.status)) {
    return run;
  }

  await prisma.autonomousProcurementOrchestrationRun.update({
    where: { id: run.id },
    data: {
      status: "RUNNING",
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      pauseReason: null,
      lastError: null,
    },
  });

  try {
    if (run.stage === "RELEASED_HANDOFF") {
      const envelope =
        await prisma.autonomousExecutionEnvelope.findFirstOrThrow({
          where: {
            id: run.executionEnvelopeId,
            tenantId: run.tenantId,
          },
        });

      if (
        envelope.status !== "RELEASED" ||
        !envelope.releasedByUserId
      ) {
        await pause({
          runId: run.id,
          tenantId: run.tenantId,
          stage: run.stage,
          reason:
            "Waiting for a human-released execution envelope with a release actor.",
        });
        return;
      }

      const job = await prepareAdapterJob({
        tenantId: run.tenantId,
        userId: envelope.releasedByUserId,
        handoffId: run.executionHandoffId,
      });

      await move({
        runId: run.id,
        tenantId: run.tenantId,
        fromStage: "RELEASED_HANDOFF",
        toStage: "ADAPTER_PREPARED",
        status:
          job.status === "DRAFT_READY"
            ? "PAUSED"
            : "READY",
        actorUserId: envelope.releasedByUserId,
        message:
          "Prepared controlled transaction adapter job.",
        data: {
          adapterJobId: job.id,
          pauseReason:
            job.status === "DRAFT_READY"
              ? "Waiting for operator activation in B9.4."
              : null,
        },
      });

      run =
        await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
          where: { id: run.id },
        });
    }

    if (run.stage === "ADAPTER_PREPARED") {
      const job =
        await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
          where: {
            id: run.adapterJobId ?? undefined,
            tenantId: run.tenantId,
          },
        });

      if (job.status === "DRAFT_READY") {
        await pause({
          runId: run.id,
          tenantId: run.tenantId,
          stage: run.stage,
          reason:
            "Waiting for human operator activation of the controlled transaction adapter.",
        });
        return;
      }

      if (!job.activatedByUserId) {
        await pause({
          runId: run.id,
          tenantId: run.tenantId,
          stage: run.stage,
          reason:
            "Adapter has advanced but no human activation actor is recorded.",
        });
        return;
      }

      if (
        ![
          "OPERATOR_ACTIVATED",
          "NATIVE_DRAFT_MATERIALIZED",
          "COMPLETED",
        ].includes(job.status)
      ) {
        await pause({
          runId: run.id,
          tenantId: run.tenantId,
          stage: run.stage,
          reason: `Adapter job is in non-runnable status ${job.status}.`,
          actorUserId: job.activatedByUserId,
        });
        return;
      }

      let nativeDraft =
        await prisma.autonomousNativeWorkflowDraft.findFirst({
          where: {
            tenantId: run.tenantId,
            adapterJobId: job.id,
          },
        });

      if (!nativeDraft) {
        nativeDraft = await materializeNativeWorkflowDraft({
          tenantId: run.tenantId,
          userId: job.activatedByUserId,
          adapterJobId: job.id,
        });
      }

      await move({
        runId: run.id,
        tenantId: run.tenantId,
        fromStage: "ADAPTER_PREPARED",
        toStage: "NATIVE_DRAFT_MATERIALIZED",
        status: "READY",
        actorUserId: job.activatedByUserId,
        message:
          "Materialized governed native workflow draft after operator activation.",
        data: {
          nativeDraftId: nativeDraft.id,
        },
      });

      run =
        await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
          where: { id: run.id },
        });
    }

    if (run.stage === "NATIVE_DRAFT_MATERIALIZED") {
      const draft =
        await prisma.autonomousNativeWorkflowDraft.findFirstOrThrow({
          where: {
            id: run.nativeDraftId ?? undefined,
            tenantId: run.tenantId,
          },
        });

      if (draft.nativeReferenceId) {
        await move({
          runId: run.id,
          tenantId: run.tenantId,
          fromStage: "NATIVE_DRAFT_MATERIALIZED",
          toStage: "NATIVE_RECORD_CREATED",
          status: "READY",
          actorUserId: draft.completedByUserId,
          message:
            "Native record was already bound to the governed draft.",
          data: {
            nativeReferenceType:
              draft.nativeReferenceType,
            nativeReferenceId:
              draft.nativeReferenceId,
            nativeReferenceUrl:
              draft.nativeReferenceUrl,
          },
        });
      } else {
        const job =
          await prisma.autonomousExecutionAdapterJob.findFirstOrThrow({
            where: {
              id: draft.adapterJobId,
              tenantId: run.tenantId,
            },
          });

        const actor =
          job.activatedByUserId ??
          draft.openedByUserId ??
          draft.createdByUserId;

        if (run.targetWorkflow === "GOVERNED_REVIEW") {
          await pause({
            runId: run.id,
            tenantId: run.tenantId,
            stage: run.stage,
            reason:
              "Governed Review remains a manual native-confirmation workflow.",
            actorUserId: actor,
          });
          return;
        }

        const nativeRecord = await createNativeRecord({
          tenantId: run.tenantId,
          userId: actor,
          nativeDraftId: draft.id,
          targetWorkflow: run.targetWorkflow,
        });

        if (!nativeRecord) {
          await pause({
            runId: run.id,
            tenantId: run.tenantId,
            stage: run.stage,
            reason: `No native execution adapter is registered for ${run.targetWorkflow}.`,
            actorUserId: actor,
          });
          return;
        }

        const refreshed =
          await prisma.autonomousNativeWorkflowDraft.findUniqueOrThrow({
            where: { id: draft.id },
          });

        await move({
          runId: run.id,
          tenantId: run.tenantId,
          fromStage: "NATIVE_DRAFT_MATERIALIZED",
          toStage: "NATIVE_RECORD_CREATED",
          status: "READY",
          actorUserId: actor,
          message:
            "Created native Enorsis draft record after all upstream human gates were satisfied.",
          data: {
            nativeReferenceType:
              refreshed.nativeReferenceType,
            nativeReferenceId:
              refreshed.nativeReferenceId,
            nativeReferenceUrl:
              refreshed.nativeReferenceUrl,
          },
        });
      }

      run =
        await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
          where: { id: run.id },
        });
    }

    if (run.stage === "NATIVE_RECORD_CREATED") {
      await prisma.autonomousProcurementOrchestrationRun.update({
        where: { id: run.id },
        data: {
          stage: "COMPLETED",
          status: "COMPLETED",
          completedAt: new Date(),
          pauseReason: null,
          lastError: null,
          nextAttemptAt: null,
        },
      });

      await event({
        tenantId: run.tenantId,
        runId: run.id,
        eventType: "ORCHESTRATION_COMPLETED",
        fromStage: "NATIVE_RECORD_CREATED",
        toStage: "COMPLETED",
        message:
          "Autonomous orchestration completed at native draft creation. Native operational approval/posting remains outside autonomous control.",
        evidence: {
          nativeReferenceType:
            run.nativeReferenceType,
          nativeReferenceId:
            run.nativeReferenceId,
          nativeReferenceUrl:
            run.nativeReferenceUrl,
        },
      });
    }
  } catch (error) {
    const latest =
      await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
        where: { id: run.id },
      });

    const message =
      error instanceof Error
        ? error.message
        : "Unknown orchestration failure.";

    const terminal =
      latest.attemptCount >= MAX_ATTEMPTS;

    await prisma.autonomousProcurementOrchestrationRun.update({
      where: { id: run.id },
      data: {
        status: terminal ? "FAILED" : "RETRY",
        lastError: message,
        nextAttemptAt: terminal ? null : retryAt(),
      },
    });

    await event({
      tenantId: run.tenantId,
      runId: run.id,
      eventType: terminal
        ? "ORCHESTRATION_FAILED"
        : "ORCHESTRATION_RETRY_SCHEDULED",
      fromStage: latest.stage,
      toStage: latest.stage,
      message,
      evidence: {
        attemptCount: latest.attemptCount,
        maxAttempts: MAX_ATTEMPTS,
      },
    });
  }

  return prisma.autonomousProcurementOrchestrationRun.findUnique({
    where: { id: run.id },
  });
}

export async function processAutonomousProcurementOrchestration() {
  const discovered =
    await discoverReleasedAutonomousHandoffs();

  const now = new Date();

  const runs =
    await prisma.autonomousProcurementOrchestrationRun.findMany({
      where: {
        status: {
          in: ["READY", "RUNNING", "RETRY", "PAUSED"],
        },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: now } },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: 50,
    });

  let processed = 0;

  for (const run of runs) {
    if (run.status === "PAUSED") {
      if (run.stage === "ADAPTER_PREPARED" && run.adapterJobId) {
        const job =
          await prisma.autonomousExecutionAdapterJob.findUnique({
            where: { id: run.adapterJobId },
          });

        if (job?.status === "DRAFT_READY") continue;
      }

      if (run.stage === "RELEASED_HANDOFF") {
        const envelope =
          await prisma.autonomousExecutionEnvelope.findUnique({
            where: { id: run.executionEnvelopeId },
          });

        if (
          envelope?.status !== "RELEASED" ||
          !envelope.releasedByUserId
        ) {
          continue;
        }
      }
    }

    await processAutonomousOrchestrationRun(run.id);
    processed += 1;
  }

  return {
    discovered,
    processed,
    scanned: runs.length,
  };
}

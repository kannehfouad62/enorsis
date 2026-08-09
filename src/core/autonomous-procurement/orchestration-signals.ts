import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  discoverReleasedAutonomousHandoffs,
  processAutonomousOrchestrationRun,
} from "@/core/autonomous-procurement/orchestrator";

const ALLOWED_SIGNALS = new Set([
  "EXECUTION_RELEASED",
  "ADAPTER_ACTIVATED",
  "NATIVE_DRAFT_CONFIRMED",
  "NATIVE_RECORD_CREATED",
  "RECOVERY_REQUESTED",
]);

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function resolveRun(input: {
  tenantId: string;
  runId?: string | null;
  executionHandoffId?: string | null;
}) {
  if (input.runId) {
    return prisma.autonomousProcurementOrchestrationRun.findFirst({
      where: {
        id: input.runId,
        tenantId: input.tenantId,
      },
    });
  }

  if (input.executionHandoffId) {
    return prisma.autonomousProcurementOrchestrationRun.findFirst({
      where: {
        tenantId: input.tenantId,
        executionHandoffId: input.executionHandoffId,
      },
    });
  }

  return null;
}

async function gateSatisfied(run: {
  tenantId: string;
  stage: string;
  executionEnvelopeId: string;
  adapterJobId: string | null;
  nativeDraftId: string | null;
}) {
  if (run.stage === "RELEASED_HANDOFF") {
    const envelope =
      await prisma.autonomousExecutionEnvelope.findFirst({
        where: {
          id: run.executionEnvelopeId,
          tenantId: run.tenantId,
        },
        select: {
          status: true,
          releasedByUserId: true,
        },
      });

    return Boolean(
      envelope?.status === "RELEASED" &&
        envelope.releasedByUserId,
    );
  }

  if (run.stage === "ADAPTER_PREPARED") {
    if (!run.adapterJobId) return false;

    const job =
      await prisma.autonomousExecutionAdapterJob.findFirst({
        where: {
          id: run.adapterJobId,
          tenantId: run.tenantId,
        },
        select: {
          status: true,
          activatedByUserId: true,
        },
      });

    return Boolean(
      job?.activatedByUserId &&
        [
          "OPERATOR_ACTIVATED",
          "NATIVE_DRAFT_MATERIALIZED",
          "COMPLETED",
        ].includes(job.status),
    );
  }

  if (run.stage === "NATIVE_DRAFT_MATERIALIZED") {
    if (!run.nativeDraftId) return false;

    const draft =
      await prisma.autonomousNativeWorkflowDraft.findFirst({
        where: {
          id: run.nativeDraftId,
          tenantId: run.tenantId,
        },
        select: {
          id: true,
          nativeReferenceId: true,
        },
      });

    return Boolean(draft);
  }

  if (run.stage === "NATIVE_RECORD_CREATED") {
    return true;
  }

  return false;
}

export async function receiveAutonomousOrchestrationSignal(
  input: {
    tenantId: string;
    runId?: string | null;
    executionHandoffId?: string | null;
    signalType: string;
    idempotencyKey: string;
    actorUserId?: string | null;
    source?: string | null;
    payload?: unknown;
  },
) {
  if (!ALLOWED_SIGNALS.has(input.signalType)) {
    throw new Error(
      `Unsupported orchestration signal type: ${input.signalType}.`,
    );
  }

  if (!input.idempotencyKey.trim()) {
    throw new Error(
      "Orchestration signal idempotencyKey is required.",
    );
  }

  let run = await resolveRun(input);

  if (
    !run &&
    input.executionHandoffId &&
    input.signalType === "EXECUTION_RELEASED"
  ) {
    await discoverReleasedAutonomousHandoffs();
    run = await resolveRun(input);
  }

  if (!run) {
    throw new Error(
      "No orchestration run could be resolved for this signal.",
    );
  }

  const existing =
    await prisma.autonomousProcurementOrchestrationSignal.findFirst({
      where: {
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
      },
    });

  if (existing) return existing;

  const signal =
    await prisma.autonomousProcurementOrchestrationSignal.create({
      data: {
        tenantId: input.tenantId,
        orchestrationRunId: run.id,
        signalType: input.signalType,
        idempotencyKey: input.idempotencyKey,
        status: "RECEIVED",
        actorUserId: input.actorUserId ?? null,
        source: input.source ?? "INTERNAL",
        payload:
          input.payload === undefined
            ? undefined
            : toInputJson(input.payload),
      },
    });

  await prisma.autonomousProcurementOrchestrationEvent.create({
    data: {
      tenantId: input.tenantId,
      orchestrationRunId: run.id,
      eventType: "RESUME_SIGNAL_RECEIVED",
      fromStage: run.stage,
      toStage: run.stage,
      actorUserId: input.actorUserId ?? null,
      message: `Received ${input.signalType} orchestration signal.`,
      evidence: {
        signalId: signal.id,
        signalType: input.signalType,
        source: input.source ?? "INTERNAL",
        idempotencyKey: input.idempotencyKey,
      },
    },
  });

  const satisfied = await gateSatisfied(run);

  if (!satisfied) {
    await prisma.autonomousProcurementOrchestrationSignal.update({
      where: { id: signal.id },
      data: {
        status: "IGNORED",
        processedAt: new Date(),
        processingResult:
          "Signal received, but persisted governance conditions do not yet satisfy the current orchestration gate.",
      },
    });

    return prisma.autonomousProcurementOrchestrationSignal.findUniqueOrThrow({
      where: { id: signal.id },
    });
  }

  if (run.status === "PAUSED") {
    await prisma.autonomousProcurementOrchestrationRun.update({
      where: { id: run.id },
      data: {
        status: "READY",
        pauseReason: null,
        nextAttemptAt: null,
      },
    });
  }

  await processAutonomousOrchestrationRun(run.id);

  const refreshed =
    await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
      where: { id: run.id },
    });

  await prisma.autonomousProcurementOrchestrationSignal.update({
    where: { id: signal.id },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
      processingResult:
        `Run processed. Current stage=${refreshed.stage}; status=${refreshed.status}.`,
    },
  });

  return prisma.autonomousProcurementOrchestrationSignal.findUniqueOrThrow({
    where: { id: signal.id },
  });
}

export async function processPendingAutonomousOrchestrationSignals() {
  const pending =
    await prisma.autonomousProcurementOrchestrationSignal.findMany({
      where: {
        status: "RECEIVED",
      },
      orderBy: { receivedAt: "asc" },
      take: 100,
    });

  let processed = 0;

  for (const signal of pending) {
    const run =
      await prisma.autonomousProcurementOrchestrationRun.findUnique({
        where: { id: signal.orchestrationRunId },
      });

    if (!run) {
      await prisma.autonomousProcurementOrchestrationSignal.update({
        where: { id: signal.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          processingResult:
            "Orchestration run no longer exists.",
        },
      });
      continue;
    }

    const satisfied = await gateSatisfied(run);

    if (!satisfied) continue;

    if (run.status === "PAUSED") {
      await prisma.autonomousProcurementOrchestrationRun.update({
        where: { id: run.id },
        data: {
          status: "READY",
          pauseReason: null,
          nextAttemptAt: null,
        },
      });
    }

    await processAutonomousOrchestrationRun(run.id);

    const refreshed =
      await prisma.autonomousProcurementOrchestrationRun.findUniqueOrThrow({
        where: { id: run.id },
      });

    await prisma.autonomousProcurementOrchestrationSignal.update({
      where: { id: signal.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        processingResult:
          `Run processed. Current stage=${refreshed.stage}; status=${refreshed.status}.`,
      },
    });

    processed += 1;
  }

  return {
    scanned: pending.length,
    processed,
  };
}

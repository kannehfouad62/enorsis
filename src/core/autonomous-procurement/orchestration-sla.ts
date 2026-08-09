import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MINUTE = 60_000;

type SlaRule = {
  type: string;
  thresholdMinutes: number;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  statuses: string[];
  stages?: string[];
  summary: string;
};

const RULES: SlaRule[] = [
  {
    type: "HUMAN_GATE_AGING",
    thresholdMinutes: 24 * 60,
    severity: "HIGH",
    statuses: ["PAUSED"],
    stages: ["ADAPTER_PREPARED", "RELEASED_HANDOFF"],
    summary:
      "Autonomous procurement orchestration is waiting on a human governance gate.",
  },
  {
    type: "EXECUTION_STUCK",
    thresholdMinutes: 60,
    severity: "HIGH",
    statuses: ["RUNNING", "READY"],
    summary:
      "Autonomous procurement orchestration has not advanced within the execution SLA.",
  },
  {
    type: "RETRY_AGING",
    thresholdMinutes: 4 * 60,
    severity: "HIGH",
    statuses: ["RETRY"],
    summary:
      "Autonomous procurement orchestration remains in retry beyond the recovery SLA.",
  },
  {
    type: "TERMINAL_FAILURE",
    thresholdMinutes: 0,
    severity: "CRITICAL",
    statuses: ["FAILED"],
    summary:
      "Autonomous procurement orchestration reached terminal failure.",
  },
];

function ageMinutes(date: Date) {
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / MINUTE),
  );
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function applies(rule: SlaRule, run: {
  status: string;
  stage: string;
}) {
  return (
    rule.statuses.includes(run.status) &&
    (!rule.stages || rule.stages.includes(run.stage))
  );
}

async function upsertEscalation(input: {
  tenantId: string;
  runId: string;
  rule: SlaRule;
  stage: string;
  runStatus: string;
  age: number;
  pauseReason: string | null;
  lastError: string | null;
  attemptCount: number;
}) {
  const details: Prisma.InputJsonValue = toInputJson({
    stage: input.stage,
    runStatus: input.runStatus,
    pauseReason: input.pauseReason,
    lastError: input.lastError,
    attemptCount: input.attemptCount,
    thresholdMinutes: input.rule.thresholdMinutes,
    detectedAt: new Date().toISOString(),
  });

  const existing =
    await prisma.autonomousProcurementOrchestrationEscalation.findFirst({
      where: {
        tenantId: input.tenantId,
        orchestrationRunId: input.runId,
        escalationType: input.rule.type,
      },
    });

  if (existing) {
    if (existing.status === "RESOLVED") {
      return prisma.autonomousProcurementOrchestrationEscalation.update({
        where: { id: existing.id },
        data: {
          status: "OPEN",
          severity: input.rule.severity,
          stage: input.stage,
          runStatus: input.runStatus,
          ageMinutes: input.age,
          thresholdMinutes:
            input.rule.thresholdMinutes,
          summary: input.rule.summary,
          details,
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date(),
          occurrenceCount: {
            increment: 1,
          },
          acknowledgedByUserId: null,
          acknowledgedAt: null,
          resolvedByUserId: null,
          resolvedAt: null,
          resolutionNote: null,
        },
      });
    }

    return prisma.autonomousProcurementOrchestrationEscalation.update({
      where: { id: existing.id },
      data: {
        severity: input.rule.severity,
        stage: input.stage,
        runStatus: input.runStatus,
        ageMinutes: input.age,
        thresholdMinutes:
          input.rule.thresholdMinutes,
        summary: input.rule.summary,
        details,
        lastDetectedAt: new Date(),
        occurrenceCount: {
          increment: 1,
        },
      },
    });
  }

  return prisma.autonomousProcurementOrchestrationEscalation.create({
    data: {
      tenantId: input.tenantId,
      orchestrationRunId: input.runId,
      escalationType: input.rule.type,
      severity: input.rule.severity,
      status: "OPEN",
      stage: input.stage,
      runStatus: input.runStatus,
      ageMinutes: input.age,
      thresholdMinutes:
        input.rule.thresholdMinutes,
      summary: input.rule.summary,
      details,
    },
  });
}

export async function evaluateAutonomousOrchestrationSla() {
  const runs =
    await prisma.autonomousProcurementOrchestrationRun.findMany({
      where: {
        status: {
          in: [
            "READY",
            "RUNNING",
            "RETRY",
            "PAUSED",
            "FAILED",
          ],
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
    });

  let breaches = 0;

  for (const run of runs) {
    const reference =
      run.lastAttemptAt ??
      run.updatedAt ??
      run.startedAt;

    const age = ageMinutes(reference);

    for (const rule of RULES) {
      if (!applies(rule, run)) continue;
      if (age < rule.thresholdMinutes) continue;

      await upsertEscalation({
        tenantId: run.tenantId,
        runId: run.id,
        rule,
        stage: run.stage,
        runStatus: run.status,
        age,
        pauseReason: run.pauseReason,
        lastError: run.lastError,
        attemptCount: run.attemptCount,
      });

      breaches += 1;
    }
  }

  return {
    scanned: runs.length,
    breaches,
  };
}

export async function acknowledgeAutonomousEscalation(input: {
  tenantId: string;
  userId: string;
  escalationId: string;
}) {
  return prisma.autonomousProcurementOrchestrationEscalation.update({
    where: { id: input.escalationId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedByUserId: input.userId,
      acknowledgedAt: new Date(),
    },
  });
}

export async function resolveAutonomousEscalation(input: {
  tenantId: string;
  userId: string;
  escalationId: string;
  note: string | null;
}) {
  const escalation =
    await prisma.autonomousProcurementOrchestrationEscalation.findFirstOrThrow({
      where: {
        id: input.escalationId,
        tenantId: input.tenantId,
      },
    });

  return prisma.autonomousProcurementOrchestrationEscalation.update({
    where: { id: escalation.id },
    data: {
      status: "RESOLVED",
      resolvedByUserId: input.userId,
      resolvedAt: new Date(),
      resolutionNote: input.note,
    },
  });
}

export async function recoverAutonomousOrchestrationRun(input: {
  tenantId: string;
  userId: string;
  runId: string;
  note: string | null;
}) {
  const run =
    await prisma.autonomousProcurementOrchestrationRun.findFirstOrThrow({
      where: {
        id: input.runId,
        tenantId: input.tenantId,
      },
    });

  if (!["FAILED", "RETRY"].includes(run.status)) {
    throw new Error(
      "Only FAILED or RETRY orchestration runs can be recovered manually.",
    );
  }

  const updated =
    await prisma.autonomousProcurementOrchestrationRun.update({
      where: { id: run.id },
      data: {
        status: "READY",
        lastError: null,
        nextAttemptAt: null,
        pauseReason: null,
      },
    });

  await prisma.autonomousProcurementOrchestrationEvent.create({
    data: {
      tenantId: input.tenantId,
      orchestrationRunId: run.id,
      eventType: "MANUAL_RECOVERY",
      fromStage: run.stage,
      toStage: run.stage,
      actorUserId: input.userId,
      message:
        input.note ??
        "Authorized operator reset orchestration run for governed recovery.",
      evidence: {
        priorStatus: run.status,
        priorError: run.lastError,
        priorAttemptCount: run.attemptCount,
      },
    },
  });

  await prisma.autonomousProcurementOrchestrationEscalation.updateMany({
    where: {
      tenantId: input.tenantId,
      orchestrationRunId: run.id,
      status: {
        in: ["OPEN", "ACKNOWLEDGED"],
      },
    },
    data: {
      status: "RESOLVED",
      resolvedByUserId: input.userId,
      resolvedAt: new Date(),
      resolutionNote:
        input.note ??
        "Resolved through governed manual recovery.",
    },
  });

  return updated;
}

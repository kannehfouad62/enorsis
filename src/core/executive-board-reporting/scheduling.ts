import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import {
  finalizeExecutiveBoardPack,
  generateExecutiveBoardPack,
} from "./service";

type Frequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

function clampDay(day: number) {
  return Math.max(1, Math.min(day, 28));
}

export function calculateNextBoardReportRun(input: {
  frequency: Frequency;
  dayOfMonth: number;
  monthOfYear?: number | null;
  hourUtc: number;
  from?: Date;
}) {
  const from = input.from ?? new Date();
  const day = clampDay(input.dayOfMonth);
  const hour = Math.max(0, Math.min(input.hourUtc, 23));

  if (input.frequency === "MONTHLY") {
    let candidate = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        day,
        hour,
        0,
        0,
      ),
    );

    if (candidate <= from) {
      candidate = new Date(
        Date.UTC(
          from.getUTCFullYear(),
          from.getUTCMonth() + 1,
          day,
          hour,
          0,
          0,
        ),
      );
    }

    return candidate;
  }

  if (input.frequency === "QUARTERLY") {
    const currentQuarter = Math.floor(from.getUTCMonth() / 3);
    const quarterMonths = [0, 3, 6, 9];

    for (const month of quarterMonths.slice(currentQuarter)) {
      const candidate = new Date(
        Date.UTC(from.getUTCFullYear(), month, day, hour, 0, 0),
      );
      if (candidate > from) return candidate;
    }

    return new Date(
      Date.UTC(from.getUTCFullYear() + 1, 0, day, hour, 0, 0),
    );
  }

  const month = Math.max(
    1,
    Math.min(input.monthOfYear ?? 1, 12),
  ) - 1;

  let candidate = new Date(
    Date.UTC(from.getUTCFullYear(), month, day, hour, 0, 0),
  );

  if (candidate <= from) {
    candidate = new Date(
      Date.UTC(from.getUTCFullYear() + 1, month, day, hour, 0, 0),
    );
  }

  return candidate;
}

export async function createExecutiveBoardReportSchedule(input: {
  tenantId: string;
  definitionId: string;
  name: string;
  frequency: Frequency;
  dayOfMonth: number;
  monthOfYear?: number | null;
  hourUtc: number;
  generateFinalized: boolean;
  actorUserId: string;
}) {
  const definition =
    await prisma.executiveBoardPackDefinition.findFirstOrThrow({
      where: {
        id: input.definitionId,
        tenantId: input.tenantId,
      },
    });

  const nextRunAt = calculateNextBoardReportRun({
    frequency: input.frequency,
    dayOfMonth: input.dayOfMonth,
    monthOfYear: input.monthOfYear ?? null,
    hourUtc: input.hourUtc,
  });

  const schedule =
    await prisma.executiveBoardReportSchedule.upsert({
      where: {
        tenantId_definitionId_frequency: {
          tenantId: input.tenantId,
          definitionId: definition.id,
          frequency: input.frequency,
        },
      },
      create: {
        tenantId: input.tenantId,
        definitionId: definition.id,
        name: input.name,
        status: "ACTIVE",
        frequency: input.frequency,
        dayOfMonth: clampDay(input.dayOfMonth),
        monthOfYear:
          input.frequency === "ANNUAL"
            ? input.monthOfYear ?? 1
            : null,
        hourUtc: Math.max(0, Math.min(input.hourUtc, 23)),
        nextRunAt,
        generateFinalized: input.generateFinalized,
        createdByUserId: input.actorUserId,
      },
      update: {
        name: input.name,
        status: "ACTIVE",
        dayOfMonth: clampDay(input.dayOfMonth),
        monthOfYear:
          input.frequency === "ANNUAL"
            ? input.monthOfYear ?? 1
            : null,
        hourUtc: Math.max(0, Math.min(input.hourUtc, 23)),
        nextRunAt,
        generateFinalized: input.generateFinalized,
      },
    });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ExecutiveBoardReporting.ScheduleConfigured",
    sourceModule: "executive-board-reporting",
    title: "Board reporting schedule configured",
    description: `${definition.name} · ${input.frequency}`,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ExecutiveBoardReportSchedule",
    subjectId: schedule.id,
    subjectLabel: schedule.name,
    actionUrl: "/app/executive/board-calendar",
  });

  return schedule;
}

export async function processExecutiveBoardReportSchedule(input: {
  scheduleId: string;
  actorUserId?: string | null;
}) {
  const schedule =
    await prisma.executiveBoardReportSchedule.findUniqueOrThrow({
      where: { id: input.scheduleId },
      include: {
        definition: true,
      },
    });

  if (schedule.status !== "ACTIVE") {
    return { status: "SKIPPED" as const };
  }

  const scheduledFor = schedule.nextRunAt;

  const run =
    await prisma.executiveBoardReportScheduleRun.upsert({
      where: {
        scheduleId_scheduledFor: {
          scheduleId: schedule.id,
          scheduledFor,
        },
      },
      create: {
        tenantId: schedule.tenantId,
        scheduleId: schedule.id,
        status: "RUNNING",
        scheduledFor,
        startedAt: new Date(),
      },
      update: {
        status: "RUNNING",
        startedAt: new Date(),
        errorMessage: null,
      },
    });

  try {
    const pack = await generateExecutiveBoardPack({
      tenantId: schedule.tenantId,
      definitionKey: schedule.definition.definitionKey,
      actorUserId:
        input.actorUserId ??
        schedule.createdByUserId,
      periodType: schedule.frequency,
    });

    if (schedule.generateFinalized) {
      await finalizeExecutiveBoardPack({
        tenantId: schedule.tenantId,
        packId: pack.id,
        actorUserId:
          input.actorUserId ??
          schedule.createdByUserId,
      });
    }

    const nextRunAt = calculateNextBoardReportRun({
      frequency: schedule.frequency,
      dayOfMonth: schedule.dayOfMonth,
      monthOfYear: schedule.monthOfYear,
      hourUtc: schedule.hourUtc,
      from: scheduledFor,
    });

    await prisma.$transaction([
      prisma.executiveBoardReportScheduleRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          boardPackId: pack.id,
          sourceFingerprint: pack.sourceFingerprint,
        },
      }),
      prisma.executiveBoardReportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastBoardPackId: pack.id,
          nextRunAt,
        },
      }),
    ]);

    await publishDomainEvent({
      tenantId: schedule.tenantId,
      eventType: "ExecutiveBoardReporting.ScheduledPackGenerated",
      aggregateType: "ExecutiveBoardReportSchedule",
      aggregateId: schedule.id,
      sourceModule: "executive-board-reporting",
      actorUserId: input.actorUserId ?? undefined,
      payload: {
        scheduleId: schedule.id,
        boardPackId: pack.id,
        packNumber: pack.packNumber,
        nextRunAt: nextRunAt.toISOString(),
      },
    });

    return {
      status: "COMPLETED" as const,
      boardPackId: pack.id,
      nextRunAt,
    };
  } catch (error) {
    await prisma.executiveBoardReportScheduleRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown scheduled board-reporting error.",
      },
    });

    throw error;
  }
}

export async function runDueExecutiveBoardReportSchedules() {
  const now = new Date();

  const schedules =
    await prisma.executiveBoardReportSchedule.findMany({
      where: {
        status: "ACTIVE",
        nextRunAt: {
          lte: now,
        },
      },
      orderBy: { nextRunAt: "asc" },
      take: 100,
    });

  const results = [];

  for (const schedule of schedules) {
    try {
      results.push(
        await processExecutiveBoardReportSchedule({
          scheduleId: schedule.id,
        }),
      );
    } catch (error) {
      results.push({
        status: "FAILED" as const,
        scheduleId: schedule.id,
        message:
          error instanceof Error
            ? error.message
            : "Unknown schedule failure.",
      });
    }
  }

  return {
    processed: schedules.length,
    completed: results.filter(
      (result) => result.status === "COMPLETED",
    ).length,
    failed: results.filter(
      (result) => result.status === "FAILED",
    ).length,
    results,
  };
}

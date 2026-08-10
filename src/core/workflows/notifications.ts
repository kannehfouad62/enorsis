import {
  PlatformRole,
  WorkflowNotificationType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  "http://localhost:3000";

function retryAt(attempt: number) {
  const delayMinutes = Math.min(2 ** Math.max(attempt, 0), 60);
  return new Date(Date.now() + delayMinutes * 60_000);
}

async function resolveRecipients(taskId: string) {
  const task = await prisma.workflowTask.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      workflowStep: true,
      workflowInstance: {
        include: { workflowDefinition: true },
      },
    },
  });

  if (task.assigneeUserId) {
    const user = await prisma.user.findUnique({
      where: { id: task.assigneeUserId },
      select: { id: true, email: true, name: true },
    });

    return user ? [{ user, task }] : [];
  }

  if (!task.assigneeRole) return [];

  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: task.workflowInstance.tenantId,
      status: "ACTIVE",
      roles: {
        has: task.assigneeRole as PlatformRole,
      },
    },
    select: {
      userId: true,
    },
  });

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: memberships.map((membership) => membership.userId),
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return memberships.flatMap((membership) => {
    const user = usersById.get(membership.userId);

    return user ? [{ user, task }] : [];
  });
}

export async function queueWorkflowTaskNotifications(taskId: string) {
  const recipients = await resolveRecipients(taskId);

  for (const { user, task } of recipients) {
    const actionUrl = `/app/workflows`;
    const base = {
      tenantId: task.workflowInstance.tenantId,
      workflowInstanceId: task.workflowInstanceId,
      workflowTaskId: task.id,
      recipientUserId: user.id,
      recipientEmail: user.email,
      type: "TASK_ASSIGNED" as const,
      subject: `Workflow task assigned: ${task.workflowStep.name}`,
      message:
        `${task.workflowInstance.workflowDefinition.name} requires your action ` +
        `for ${task.workflowInstance.resourceType} ${task.workflowInstance.resourceId}.`,
      actionUrl,
      scheduledAt: new Date(),
      metadata: {
        workflowName: task.workflowInstance.workflowDefinition.name,
        stepName: task.workflowStep.name,
        resourceType: task.workflowInstance.resourceType,
        resourceId: task.workflowInstance.resourceId,
        dueAt: task.dueAt,
      },
    };

    await prisma.workflowNotification.createMany({
      data: [
        {
          ...base,
          channel: "IN_APP",
          deduplicationKey: `task-assigned:${task.id}:${user.id}:in-app`,
        },
        ...(user.email
          ? [
              {
                ...base,
                channel: "EMAIL" as const,
                deduplicationKey: `task-assigned:${task.id}:${user.id}:email`,
              },
            ]
          : []),
      ],
      skipDuplicates: true,
    });
  }

  return { recipients: recipients.length };
}

export async function queueWorkflowReminderNotifications() {
  const now = new Date();
  const dueSoon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.workflowTask.findMany({
    where: {
      status: { in: ["AVAILABLE", "IN_PROGRESS", "ESCALATED"] },
      dueAt: { not: null, lte: dueSoon },
    },
    select: { id: true, dueAt: true, status: true },
    take: 250,
  });

  let queued = 0;

  for (const task of tasks) {
    const recipients = await resolveRecipients(task.id);
    const overdue = Boolean(task.dueAt && task.dueAt < now);
    const type: WorkflowNotificationType = overdue
      ? WorkflowNotificationType.TASK_OVERDUE
      : WorkflowNotificationType.TASK_DUE_SOON;

    for (const { user, task: detail } of recipients) {
      const dateKey = now.toISOString().slice(0, 10);
      const subject = overdue
        ? `Overdue workflow task: ${detail.workflowStep.name}`
        : `Workflow task due soon: ${detail.workflowStep.name}`;
      const message = overdue
        ? `This workflow task was due ${detail.dueAt?.toLocaleString()}.`
        : `This workflow task is due ${detail.dueAt?.toLocaleString()}.`;

      const result = await prisma.workflowNotification.createMany({
        data: [
          {
            tenantId: detail.workflowInstance.tenantId,
            workflowInstanceId: detail.workflowInstanceId,
            workflowTaskId: detail.id,
            recipientUserId: user.id,
            recipientEmail: user.email,
            type,
            channel: "IN_APP",
            subject,
            message,
            actionUrl: "/app/workflows",
            deduplicationKey:
              `${type.toLowerCase()}:${detail.id}:${user.id}:${dateKey}:in-app`,
            metadata: { dueAt: detail.dueAt },
          },
          ...(user.email
            ? [
                {
                  tenantId: detail.workflowInstance.tenantId,
                  workflowInstanceId: detail.workflowInstanceId,
                  workflowTaskId: detail.id,
                  recipientUserId: user.id,
                  recipientEmail: user.email,
                  type,
                  channel: "EMAIL" as const,
                  subject,
                  message,
                  actionUrl: "/app/workflows",
                  deduplicationKey:
                    `${type.toLowerCase()}:${detail.id}:${user.id}:${dateKey}:email`,
                  metadata: { dueAt: detail.dueAt },
                },
              ]
            : []),
        ],
        skipDuplicates: true,
      });

      queued += result.count;
    }
  }

  return { queued };
}

async function sendEmail({
  to,
  subject,
  message,
  actionUrl,
}: {
  to: string;
  subject: string;
  message: string;
  actionUrl: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ??
    process.env.WORKFLOW_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Email delivery requires RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html:
        `<div style="font-family:Arial,sans-serif;line-height:1.6">` +
        `<h2>${escapeHtml(subject)}</h2>` +
        `<p>${escapeHtml(message)}</p>` +
        (actionUrl
          ? `<p><a href="${APP_URL}${actionUrl}">Open Enorsis</a></p>`
          : "") +
        `<p style="color:#64748b;font-size:12px">` +
        `This is an automated Enorsis workflow notification.</p></div>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Email provider returned HTTP ${response.status}: ` +
        (await response.text()).slice(0, 1_000),
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function processWorkflowNotificationOutbox(limit = 50) {
  const now = new Date();

  const notifications = await prisma.workflowNotification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      scheduledAt: { lte: now },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });

  let delivered = 0;
  let failed = 0;

  for (const notification of notifications) {
    const claimed = await prisma.workflowNotification.updateMany({
      where: {
        id: notification.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: "PROCESSING",
        processingStartedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (claimed.count !== 1) continue;

    try {
      if (notification.channel === "EMAIL") {
        if (!notification.recipientEmail) {
          throw new Error("The recipient has no email address.");
        }

        await sendEmail({
          to: notification.recipientEmail,
          subject: notification.subject,
          message: notification.message,
          actionUrl: notification.actionUrl,
        });
      }

      await prisma.workflowNotification.update({
        where: { id: notification.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          nextAttemptAt: null,
          errorMessage: null,
        },
      });
      delivered += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Notification delivery failed.";
      const nextAttempt = notification.attemptCount + 1;
      const exhausted = nextAttempt >= 5;

      await prisma.workflowNotification.update({
        where: { id: notification.id },
        data: {
          status: exhausted ? "CANCELLED" : "FAILED",
          failedAt: new Date(),
          nextAttemptAt: exhausted ? null : retryAt(nextAttempt),
          errorMessage: message,
        },
      });
      failed += 1;
    }
  }

  return { selected: notifications.length, delivered, failed };
}

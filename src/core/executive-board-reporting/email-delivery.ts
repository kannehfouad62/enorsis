import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import {
  createBoardAccessToken,
  hashBoardAccessToken,
} from "./secure-access";

function resendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function applicationBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function senderAddress() {
  return (
    process.env.BOARD_REPORT_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    "Enorsis Board Reporting <no-reply@enorsis.com>"
  );
}

export async function sendExecutiveBoardDistribution(input: {
  tenantId: string;
  distributionId: string;
  actorUserId: string;
  accessHours?: number;
}) {
  const distribution =
    await prisma.executiveBoardDistribution.findFirstOrThrow({
      where: {
        id: input.distributionId,
        tenantId: input.tenantId,
      },
      include: {
        boardPack: true,
        recipientGroup: true,
        deliveries: {
          include: {
            recipient: true,
          },
        },
      },
    });

  if (distribution.boardPack.status !== "FINALIZED") {
    throw new Error("Only finalized board packs can be emailed.");
  }

  const resend = resendClient();
  const baseUrl = applicationBaseUrl();
  const accessHours = Math.max(1, Math.min(input.accessHours ?? 168, 720));
  const accessExpiresAt = new Date(Date.now() + accessHours * 3_600_000);

  let sent = 0;
  let failed = 0;

  for (const delivery of distribution.deliveries) {
    if (delivery.status === "REVOKED") continue;

    const token = createBoardAccessToken();
    const accessTokenHash = hashBoardAccessToken(token);
    const portalUrl =
      `${baseUrl}/board/secure/${delivery.id}` +
      `?token=${encodeURIComponent(token)}`;

    try {
      const result = await resend.emails.send({
        from: senderAddress(),
        to: delivery.recipient.email,
        subject: distribution.subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
            <h2>${distribution.boardPack.title}</h2>
            <p>${distribution.message ?? "A finalized Enorsis board pack is available for your secure review."}</p>
            <p>
              <a href="${portalUrl}"
                 style="display:inline-block;padding:12px 18px;background:#0f172a;color:white;text-decoration:none;border-radius:8px">
                Open secure board pack
              </a>
            </p>
            <p style="font-size:12px;color:#64748b">
              This link expires on ${accessExpiresAt.toUTCString()} and may be revoked by the organization.
            </p>
            <p style="font-size:12px;color:#64748b">
              Pack: ${distribution.boardPack.packNumber}<br/>
              Distribution: ${distribution.distributionNumber}
            </p>
          </div>
        `,
      });

      await prisma.executiveBoardDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          accessTokenHash,
          accessExpiresAt,
          emailMessageId: result.data?.id ?? null,
          failureReason: null,
        },
      });

      sent += 1;
    } catch (error) {
      failed += 1;

      await prisma.executiveBoardDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          failureReason:
            error instanceof Error
              ? error.message
              : "Unknown Resend board delivery failure.",
        },
      });
    }
  }

  const status =
    failed === 0
      ? "SENT"
      : sent > 0
        ? "PARTIALLY_SENT"
        : "FAILED";

  await prisma.executiveBoardDistribution.update({
    where: { id: distribution.id },
    data: {
      status,
      completedAt: new Date(),
    },
  });

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "ExecutiveBoardReporting.DistributionEmailCompleted",
    aggregateType: "ExecutiveBoardDistribution",
    aggregateId: distribution.id,
    sourceModule: "executive-board-reporting",
    actorUserId: input.actorUserId,
    payload: {
      distributionId: distribution.id,
      distributionNumber: distribution.distributionNumber,
      sent,
      failed,
      status,
      accessExpiresAt: accessExpiresAt.toISOString(),
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ExecutiveBoardReporting.DistributionEmailCompleted",
    sourceModule: "executive-board-reporting",
    title: "Board-pack email distribution completed",
    description: `${distribution.distributionNumber} · ${sent} sent · ${failed} failed`,
    severity: failed > 0 ? "WARNING" : "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ExecutiveBoardDistribution",
    subjectId: distribution.id,
    subjectLabel: distribution.distributionNumber,
    actionUrl: "/app/executive/board-distribution",
  });

  return { sent, failed, status, accessExpiresAt };
}

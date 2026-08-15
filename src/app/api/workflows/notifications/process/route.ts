import { NextResponse } from "next/server";
import {
  processPendingNotificationDeliveries,
} from "@/core/notifications";
import {
  processWorkflowNotificationOutbox,
  queueWorkflowReminderNotifications,
} from "@/core/workflows/notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const reminders =
    await queueWorkflowReminderNotifications();

  const [workflowDelivery, enterpriseDelivery] =
    await Promise.all([
      processWorkflowNotificationOutbox(100),
      processPendingNotificationDeliveries({
        limit: 100,
      }),
    ]);

  return NextResponse.json({
    reminders,
    workflowDelivery,
    enterpriseDelivery: {
      selected: enterpriseDelivery.length,
      delivered: enterpriseDelivery.filter(
        (item) => item.status === "DELIVERED",
      ).length,
      pending: enterpriseDelivery.filter(
        (item) => item.status === "PENDING",
      ).length,
      deadLetter: enterpriseDelivery.filter(
        (item) => item.status === "DEAD_LETTER",
      ).length,
    },
  });
}

export async function POST(request: Request) {
  return GET(request);
}

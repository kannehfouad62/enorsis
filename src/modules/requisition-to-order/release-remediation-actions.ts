"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

function refresh() {
  for (const path of [
    "/app/requisition-to-order",
    "/app/requisition-to-order/assurance",
    "/app/requisition-to-order/assurance/sla",
    "/app/requisition-to-order/assurance/certification",
    "/app/requisition-to-order/assurance/certification/remediation",
    "/app/requisition-to-order/assurance/certification/remediation/closure",
  ]) revalidatePath(path);
}

export async function extendRequiredByDateAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const journeyId = field(data, "journeyId");
  const date = field(data, "requiredByDate");
  const reason = field(data, "reason");

  if (!journeyId || !date || reason.length < 10)
    throw new Error("Journey, future date, and a reason of at least 10 characters are required.");

  const nextDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(nextDate.getTime()) || nextDate <= new Date())
    throw new Error("The new required-by date must be in the future.");

  const journey = await prisma.requisitionOrderJourney.findFirstOrThrow({
    where: { id: journeyId, tenantId: user.tenantId },
    select: { id: true, requiredByDate: true },
  });

  await prisma.requisitionOrderJourney.update({
    where: { id: journey.id },
    data: { requiredByDate: nextDate },
  });

  refresh();
}

export async function cancelTestJourneyAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const journeyId = field(data, "journeyId");
  const reason = field(data, "reason");
  const confirmation = field(data, "confirmation");

  if (!journeyId) throw new Error("Journey is required.");
  if (reason.length < 10) {
    throw new Error("A cancellation reason of at least 10 characters is required.");
  }
  if (confirmation !== "CANCEL TEST JOURNEY") {
    throw new Error('Type "CANCEL TEST JOURNEY" to confirm cancellation.');
  }

  const journey =
    await prisma.requisitionOrderJourney.findFirstOrThrow({
      where: {
        id: journeyId,
        tenantId: user.tenantId,
      },
      select: { id: true, status: true },
    });

  if (journey.status === "CANCELLED") {
    refresh();
    return;
  }

  await prisma.requisitionOrderJourney.update({
    where: { id: journey.id },
    data: { status: "CANCELLED" },
  });

  refresh();
}

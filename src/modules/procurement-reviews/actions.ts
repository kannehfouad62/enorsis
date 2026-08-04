"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createProcurementReviewAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.procurementReview.create({
    data: {
      tenantId: user.tenantId,
      title: field(formData, "title"),
      type: field(formData, "type") as
        | "WEEKLY_OPERATING_REVIEW"
        | "MONTHLY_BUSINESS_REVIEW"
        | "QUARTERLY_BUSINESS_REVIEW"
        | "EXECUTIVE_COMMITTEE"
        | "BOARD_PACK",
      periodStart: new Date(field(formData, "periodStart")),
      periodEnd: new Date(field(formData, "periodEnd")),
      meetingAt: new Date(field(formData, "meetingAt")),
      preparedByUserId: user.id,
      chairUserId: field(formData, "chairUserId") || null,
      executiveSummary: field(formData, "executiveSummary") || null,
      accomplishments: field(formData, "accomplishments") || null,
      decisionsRequired: field(formData, "decisionsRequired") || null,
      keyRisks: field(formData, "keyRisks") || null,
      nextPeriodPriorities: field(formData, "nextPeriodPriorities") || null,
    },
  });
  revalidatePath("/app/reviews");
}

export async function addProcurementReviewMetricAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const procurementReviewId = field(formData, "procurementReviewId");
  await prisma.procurementReview.findFirstOrThrow({
    where: { id: procurementReviewId, tenantId: user.tenantId },
  });
  await prisma.procurementReviewMetric.create({
    data: {
      procurementReviewId,
      key: field(formData, "key"),
      name: field(formData, "name"),
      category: field(formData, "category"),
      value: field(formData, "value") ? Number(field(formData, "value")) : null,
      target: field(formData, "target") ? Number(field(formData, "target")) : null,
      unit: field(formData, "unit") || null,
      status: field(formData, "status") as "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "NOT_AVAILABLE",
      commentary: field(formData, "commentary") || null,
    },
  });
  revalidatePath(`/app/reviews/${procurementReviewId}`);
}

export async function addProcurementReviewActionItem(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const procurementReviewId = field(formData, "procurementReviewId");
  await prisma.procurementReview.findFirstOrThrow({
    where: { id: procurementReviewId, tenantId: user.tenantId },
  });
  await prisma.procurementReviewAction.create({
    data: {
      procurementReviewId,
      title: field(formData, "title"),
      description: field(formData, "description") || null,
      ownerUserId: field(formData, "ownerUserId"),
      dueAt: new Date(field(formData, "dueAt")),
    },
  });
  revalidatePath(`/app/reviews/${procurementReviewId}`);
}

export async function changeProcurementReviewStatusAction(formData: FormData) {
  const user = await requireAnyRole(["PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"]);
  const reviewId = field(formData, "reviewId");
  const status = field(formData, "status") as "IN_REVIEW" | "APPROVED" | "PUBLISHED";
  const review = await prisma.procurementReview.findFirstOrThrow({
    where: { id: reviewId, tenantId: user.tenantId },
  });
  await prisma.procurementReview.update({
    where: { id: review.id },
    data: {
      status,
      approvedByUserId: status === "APPROVED" ? user.id : review.approvedByUserId,
      approvedAt: status === "APPROVED" ? new Date() : review.approvedAt,
      publishedAt: status === "PUBLISHED" ? new Date() : review.publishedAt,
    },
  });
  revalidatePath(`/app/reviews/${review.id}`);
  revalidatePath("/app/reviews");
}

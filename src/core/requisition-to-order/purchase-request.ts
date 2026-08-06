import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { transitionRequisitionOrderJourney } from "./service";

export async function assessPurchaseRequestSubmission(input: {
  journeyId: string;
  purchaseRequestId: string;
  requestTitle?: string | null;
  requestNumber?: string | null;
  currencyCode: string;
  declaredLineCount: number;
  declaredTotalAmount?: number | null;
  businessJustification?: string | null;
  budgetReference?: string | null;
  costCenterReference?: string | null;
  requiredByDate?: Date | null;
  supplierRequired: boolean;
  supplierId?: string | null;
  actorUserId: string;
}) {
  const journey = await prisma.requisitionOrderJourney.findUniqueOrThrow({
    where: { id: input.journeyId },
  });

  const request = await prisma.purchaseRequest.findFirst({
    where: { id: input.purchaseRequestId, tenantId: journey.tenantId },
    select: { id: true },
  });

  const checks = [
    {
      key: "request.exists",
      name: "Purchase request exists",
      status: request ? ("PASS" as const) : ("FAIL" as const),
      releaseBlocking: true,
      observedValue: request ? "FOUND" : "NOT_FOUND",
      expectedValue: "FOUND",
      remediation: request ? null : "Select a purchase request belonging to this tenant.",
    },
    {
      key: "request.lines",
      name: "Request contains line items",
      status: input.declaredLineCount > 0 ? ("PASS" as const) : ("FAIL" as const),
      releaseBlocking: true,
      observedValue: String(input.declaredLineCount),
      expectedValue: "At least 1",
      remediation: input.declaredLineCount > 0 ? null : "Add at least one line item.",
    },
    {
      key: "request.amount",
      name: "Request total is positive",
      status: (input.declaredTotalAmount ?? 0) > 0 ? ("PASS" as const) : ("FAIL" as const),
      releaseBlocking: true,
      observedValue: String(input.declaredTotalAmount ?? 0),
      expectedValue: "Greater than 0",
      remediation: (input.declaredTotalAmount ?? 0) > 0 ? null : "Enter a positive total.",
    },
    {
      key: "request.justification",
      name: "Business justification provided",
      status: input.businessJustification ? ("PASS" as const) : ("FAIL" as const),
      releaseBlocking: true,
      observedValue: input.businessJustification ? "PROVIDED" : "MISSING",
      expectedValue: "PROVIDED",
      remediation: input.businessJustification ? null : "Provide a business justification.",
    },
    {
      key: "request.accounting",
      name: "Budget or cost-center reference provided",
      status: input.budgetReference || input.costCenterReference ? ("PASS" as const) : ("WARN" as const),
      releaseBlocking: false,
      observedValue: input.budgetReference || input.costCenterReference ? "PROVIDED" : "MISSING",
      expectedValue: "PROVIDED",
      remediation: input.budgetReference || input.costCenterReference ? null : "Provide budget or cost-center context before approval.",
    },
  ];

  const blocked = checks.some((check) => check.status === "FAIL" && check.releaseBlocking);

  const assessment = await prisma.requisitionSubmissionAssessment.upsert({
    where: {
      journeyId_purchaseRequestId: {
        journeyId: input.journeyId,
        purchaseRequestId: input.purchaseRequestId,
      },
    },
    create: {
      tenantId: journey.tenantId,
      journeyId: input.journeyId,
      purchaseRequestId: input.purchaseRequestId,
      status: blocked ? "BLOCKED" : "READY",
      requestTitle: input.requestTitle ?? null,
      requestNumber: input.requestNumber ?? null,
      currencyCode: input.currencyCode,
      declaredLineCount: input.declaredLineCount,
      declaredTotalAmount: input.declaredTotalAmount ?? null,
      businessJustification: input.businessJustification ?? null,
      budgetReference: input.budgetReference ?? null,
      costCenterReference: input.costCenterReference ?? null,
      requiredByDate: input.requiredByDate ?? null,
      supplierRequired: input.supplierRequired,
      supplierId: input.supplierId ?? null,
      validationSummary: toJson({ blocked, total: checks.length }),
      assessedByUserId: input.actorUserId,
      assessedAt: new Date(),
      checks: {
        create: checks.map((check) => ({
          ...check,
          remediation: check.remediation ?? undefined,
        })),
      },
    },
    update: {
      status: blocked ? "BLOCKED" : "READY",
      declaredLineCount: input.declaredLineCount,
      declaredTotalAmount: input.declaredTotalAmount ?? null,
      businessJustification: input.businessJustification ?? null,
      budgetReference: input.budgetReference ?? null,
      costCenterReference: input.costCenterReference ?? null,
      validationSummary: toJson({ blocked, total: checks.length }),
      assessedByUserId: input.actorUserId,
      assessedAt: new Date(),
      checks: {
        deleteMany: {},
        create: checks.map((check) => ({
          ...check,
          remediation: check.remediation ?? undefined,
        })),
      },
    },
    include: { checks: true },
  });

  await prisma.requisitionOrderJourney.update({
    where: { id: journey.id },
    data: {
      purchaseRequestId: input.purchaseRequestId,
      currencyCode: input.currencyCode,
      estimatedAmount: input.declaredTotalAmount ?? undefined,
      requiredByDate: input.requiredByDate ?? undefined,
      supplierId: input.supplierId ?? undefined,
    },
  });

  return assessment;
}

export async function submitAssessedPurchaseRequest(input: {
  assessmentId: string;
  actorUserId: string;
}) {
  const assessment = await prisma.requisitionSubmissionAssessment.findUniqueOrThrow({
    where: { id: input.assessmentId },
    include: { journey: true, checks: true },
  });

  if (
    assessment.status !== "READY" ||
    assessment.checks.some((check) => check.status === "FAIL" && check.releaseBlocking)
  ) {
    throw new Error("Purchase request submission is blocked by failed readiness checks.");
  }

  await prisma.requisitionSubmissionAssessment.update({
    where: { id: assessment.id },
    data: {
      status: "SUBMITTED",
      submittedByUserId: input.actorUserId,
      submittedAt: new Date(),
    },
  });

  await transitionRequisitionOrderJourney({
    journeyId: assessment.journeyId,
    status: "REQUISITION_SUBMITTED",
    actorUserId: input.actorUserId,
    description: "Purchase request passed submission readiness checks.",
  });

  await publishDomainEvent({
    tenantId: assessment.tenantId,
    eventType: "PurchaseRequest.Submitted",
    aggregateType: "PurchaseRequest",
    aggregateId: assessment.purchaseRequestId,
    sourceModule: "requisition-to-order",
    correlationId: assessment.journey.correlationId,
    actorUserId: input.actorUserId,
    payload: { assessmentId: assessment.id, journeyId: assessment.journeyId },
  });

  await recordEnterpriseActivity({
    tenantId: assessment.tenantId,
    activityType: "PurchaseRequest.Submitted",
    sourceModule: "requisition-to-order",
    title: "Purchase request submitted",
    description: assessment.requestNumber ?? assessment.requestTitle ?? assessment.purchaseRequestId,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "PurchaseRequest",
    subjectId: assessment.purchaseRequestId,
    actionUrl: "/app/requisition-to-order/purchase-request",
    correlationId: assessment.journey.correlationId,
  });
}

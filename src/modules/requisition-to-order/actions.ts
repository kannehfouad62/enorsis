"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createRequisitionOrderJourney,
  raiseRequisitionOrderException,
  transitionRequisitionOrderJourney,
} from "@/core/requisition-to-order";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const allowedRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createJourneyAction(data: FormData) {
  const user = await requireAnyRole([...allowedRoles]);
  await createRequisitionOrderJourney({
    tenantId: user.tenantId,
    title: field(data, "title"),
    description: field(data, "description") || null,
    requesterUserId: user.id,
    currencyCode: field(data, "currencyCode") || "USD",
    estimatedAmount: field(data, "estimatedAmount")
      ? Number(field(data, "estimatedAmount"))
      : null,
    requiredByDate: field(data, "requiredByDate")
      ? new Date(field(data, "requiredByDate"))
      : null,
  });
  revalidatePath("/app/requisition-to-order");
}

export async function transitionJourneyAction(data: FormData) {
  const user = await requireAnyRole([...allowedRoles]);
  await transitionRequisitionOrderJourney({
    journeyId: field(data, "journeyId"),
    status: field(data, "status") as
      | "DRAFT"
      | "REQUISITION_SUBMITTED"
      | "APPROVAL_PENDING"
      | "APPROVED"
      | "ORDER_PENDING"
      | "ORDER_ISSUED"
      | "PARTIALLY_RECEIVED"
      | "RECEIVED"
      | "CLOSED"
      | "CANCELLED"
      | "EXCEPTION",
    actorUserId: user.id,
    description: field(data, "description") || null,
  });
  revalidatePath("/app/requisition-to-order");
}

export async function raiseJourneyExceptionAction(data: FormData) {
  const user = await requireAnyRole([...allowedRoles]);
  await raiseRequisitionOrderException({
    journeyId: field(data, "journeyId"),
    code: field(data, "code"),
    title: field(data, "exceptionTitle"),
    description: field(data, "exceptionDescription") || null,
    severity: field(data, "severity") as
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL",
    actorUserId: user.id,
  });
  revalidatePath("/app/requisition-to-order");
}

const assuranceFindingDefinitions = {
  APPROVAL_ROUTE_MISSING: {
    title: "Approval route missing",
    severity: "HIGH",
    description:
      "Lifecycle assurance detected a journey awaiting approval without a recorded approval route.",
  },
  APPROVER_MISSING: {
    title: "Approver assignment missing",
    severity: "HIGH",
    description:
      "Lifecycle assurance detected approval routing without assigned approver decisions.",
  },
  PO_EVIDENCE_MISSING: {
    title: "Purchase-order evidence missing",
    severity: "HIGH",
    description:
      "Lifecycle assurance detected a journey state that requires a purchase order, but no purchase-order execution exists.",
  },
  RECEIPT_EVIDENCE_MISSING: {
    title: "Receipt evidence missing",
    severity: "HIGH",
    description:
      "Lifecycle assurance detected receipt progress without a goods-receipt session.",
  },
  CLOSED_WITH_OPEN_EXCEPTION: {
    title: "Closed journey has unresolved exceptions",
    severity: "CRITICAL",
    description:
      "Lifecycle assurance detected a closed journey with one or more unresolved exceptions.",
  },
  REQUIRED_DATE_OVERDUE: {
    title: "Required-by date overdue",
    severity: "MEDIUM",
    description:
      "Lifecycle assurance detected that the required-by date has passed while the journey remains open.",
  },
  PAYMENT_READINESS_MISSING: {
    title: "Payment readiness evidence missing",
    severity: "MEDIUM",
    description:
      "Lifecycle assurance detected an approved-for-payment three-way match without an AP payment-readiness case.",
  },
  STATUS_EXCEPTION_MISMATCH: {
    title: "Journey status and exception state mismatch",
    severity: "MEDIUM",
    description:
      "Lifecycle assurance detected unresolved journey exceptions while the journey status is not EXCEPTION.",
  },
} as const;

export async function promoteAssuranceFindingAction(
  data: FormData,
) {
  const user = await requireAnyRole([...allowedRoles]);
  const journeyId = field(data, "journeyId");
  const code = field(data, "code");

  const definition =
    assuranceFindingDefinitions[
      code as keyof typeof assuranceFindingDefinitions
    ];

  if (!definition) {
    throw new Error(
      "Unsupported lifecycle-assurance finding.",
    );
  }

  const { prisma } = await import("@/lib/prisma");

  const journey =
    await prisma.requisitionOrderJourney.findFirstOrThrow({
      where: {
        id: journeyId,
        tenantId: user.tenantId,
      },
      include: {
        exceptions: {
          where: { code },
          orderBy: { createdAt: "desc" },
        },
      },
    });

  const duplicateOpenException =
    journey.exceptions.find(
      (exception) =>
        ![
          "RESOLVED",
          "CLOSED",
          "DISMISSED",
        ].includes(exception.status),
    );

  if (!duplicateOpenException) {
    await raiseRequisitionOrderException({
      journeyId,
      code,
      title: definition.title,
      description: definition.description,
      severity: definition.severity,
      actorUserId: user.id,
    });
  }

  revalidatePath("/app/requisition-to-order");
  revalidatePath(
    "/app/requisition-to-order/assurance",
  );
}

export async function updateJourneyExceptionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...allowedRoles]);

  const { updateRequisitionOrderException } =
    await import("@/core/requisition-to-order/service");

  const exceptionId = field(data, "exceptionId");
  const status = field(data, "status") as
    | "OPEN"
    | "INVESTIGATING"
    | "RESOLVED";

  await updateRequisitionOrderException({
    exceptionId,
    actorUserId: user.id,
    ownerUserId:
      field(data, "ownerUserId") || undefined,
    status,
    note: field(data, "note") || null,
  });

  revalidatePath("/app/requisition-to-order");
  revalidatePath(
    "/app/requisition-to-order/assurance",
  );
}

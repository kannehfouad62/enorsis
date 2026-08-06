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

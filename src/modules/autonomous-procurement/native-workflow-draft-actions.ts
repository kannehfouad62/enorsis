"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  completeNativeDraft,
  materializeNativeWorkflowDraft,
  openNativeDraft,
} from "@/core/autonomous-procurement/native-workflow-drafts";
import { prisma } from "@/lib/prisma";

const operatorRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function materializeNativeWorkflowDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...operatorRoles]);

  const draft = await materializeNativeWorkflowDraft({
    tenantId: user.tenantId,
    userId: user.id,
    adapterJobId: field(data, "adapterJobId"),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Native draft operator",
      action: "autonomous_execution.native_draft.materialize",
      resourceType: "AutonomousNativeWorkflowDraft",
      resourceId: draft.id,
      after: {
        status: draft.status,
        targetWorkflow: draft.targetWorkflow,
        nativeRoute: draft.nativeRoute,
        directDatabaseCreation: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts",
  );
}

export async function openNativeWorkflowAction(data: FormData) {
  const user = await requireAnyRole([...operatorRoles]);

  const draft = await openNativeDraft({
    tenantId: user.tenantId,
    userId: user.id,
    nativeDraftId: field(data, "nativeDraftId"),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Native draft operator",
      action: "autonomous_execution.native_draft.open",
      resourceType: "AutonomousNativeWorkflowDraft",
      resourceId: draft.id,
      after: {
        status: draft.status,
        nativeRoute: draft.nativeRoute,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts",
  );
}

export async function completeNativeWorkflowDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...operatorRoles]);

  const draft = await completeNativeDraft({
    tenantId: user.tenantId,
    userId: user.id,
    nativeDraftId: field(data, "nativeDraftId"),
    nativeReferenceId: field(data, "nativeReferenceId"),
    nativeReferenceUrl: field(data, "nativeReferenceUrl") || null,
    note: field(data, "note") || null,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Native draft operator",
      action: "autonomous_execution.native_draft.confirm",
      resourceType: "AutonomousNativeWorkflowDraft",
      resourceId: draft.id,
      after: {
        status: draft.status,
        nativeReferenceId: draft.nativeReferenceId,
        nativeReferenceUrl: draft.nativeReferenceUrl,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts",
  );
}

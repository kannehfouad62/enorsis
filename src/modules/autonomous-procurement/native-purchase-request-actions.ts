"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createNativePurchaseRequestDraft } from "@/core/autonomous-procurement/native-purchase-request-adapter";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNativePurchaseRequestDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const purchaseRequest =
    await createNativePurchaseRequestDraft({
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
      actorLabel:
        user.email ?? "Autonomous PR operator",
      action:
        "autonomous_execution.native_purchase_request.create_draft",
      resourceType: "PurchaseRequest",
      resourceId: purchaseRequest.id,
      after: {
        requestNumber:
          purchaseRequest.requestNumber,
        status: purchaseRequest.status,
        totalAmount: Number(
          purchaseRequest.totalAmount,
        ),
        autonomousSubmissionPerformed: false,
        autonomousApprovalPerformed: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts/purchase-requests",
  );
  revalidatePath("/app/requests");
  revalidatePath(
    `/app/requests/${purchaseRequest.id}`,
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAnyRole } from "@/core/auth/authorization";
import { SupplierDocumentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const reviewSchema = z
  .object({
    documentId: z.string().trim().min(1),
    decision: z.enum(["VERIFIED", "REJECTED"]),
    reviewerNotes: z.string().trim().max(2000).optional(),
  })
  .superRefine((input, ctx) => {
    if (
      input.decision === "REJECTED" &&
      !input.reviewerNotes?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerNotes"],
        message: "A rejection reason is required.",
      });
    }
  });

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function reviewPlatformSupplierDocumentAction(
  formData: FormData,
) {
  const user = await requireAnyRole(["PLATFORM_SUPER_ADMIN"]);

  const input = reviewSchema.parse({
    documentId: value(formData, "documentId"),
    decision: value(formData, "decision"),
    reviewerNotes: value(formData, "reviewerNotes") || undefined,
  });

  const document = await prisma.supplierDocument.findFirstOrThrow({
    where: {
      id: input.documentId,
      supplier: {
        isTenantSelfProfile: true,
      },
    },
    include: {
      supplier: {
        include: {
          tenant: true,
        },
      },
    },
  });

  const updated = await prisma.supplierDocument.update({
    where: { id: document.id },
    data: {
      status: input.decision as SupplierDocumentStatus,
      verifiedAt:
        input.decision === "VERIFIED" ? new Date() : null,
      verifiedBy:
        input.decision === "VERIFIED" ? user.id : null,
      rejectionReason:
        input.decision === "REJECTED"
          ? input.reviewerNotes
          : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: document.supplier.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action:
        input.decision === "VERIFIED"
          ? "platform.supplier_document.verified"
          : "platform.supplier_document.rejected",
      resourceType: "SupplierDocument",
      resourceId: document.id,
      before: {
        status: document.status,
        verifiedAt: document.verifiedAt,
        verifiedBy: document.verifiedBy,
        rejectionReason: document.rejectionReason,
      },
      after: {
        status: updated.status,
        verifiedAt: updated.verifiedAt,
        verifiedBy: updated.verifiedBy,
        rejectionReason: updated.rejectionReason,
      },
      metadata: {
        platformReview: true,
        supplierId: document.supplier.id,
        supplierName:
          document.supplier.tradingName ??
          document.supplier.legalName,
        supplierTenantId: document.supplier.tenantId,
        supplierTenantName: document.supplier.tenant.name,
        reviewerNotes: input.reviewerNotes ?? null,
      },
    },
  });

  revalidatePath("/app/platform/supplier-verification");
  revalidatePath("/app/supplier-portal");
  revalidatePath("/app/supplier-portal/documents");

  redirect(
    `/app/platform/supplier-verification?reviewed=${input.decision.toLowerCase()}`,
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import {
  SupplierDocumentStatus,
  SupplierDocumentType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { uploadPrivateSupplierDocument } from "@/modules/suppliers/documents";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
]);

const documentSchema = z.object({
  type: z.enum([
    "TAX",
    "INSURANCE",
    "CERTIFICATION",
    "LICENSE",
    "ESG",
    "FINANCIAL",
    "OTHER",
  ]),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function uploadSupplierQualificationDocumentAction(
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  if (!session.user.roles.some((role) => allowedRoles.has(role))) {
    redirect("/app/unauthorized");
  }

  const input = documentSchema.parse({
    type: value(formData, "type"),
    issuedAt: value(formData, "issuedAt") || undefined,
    expiresAt: value(formData, "expiresAt") || undefined,
  });

  const supplier = await ensureTenantSelfSupplierProfile({
    tenantId: session.user.tenantId,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("A qualification document file is required.");
  }

  const blob = await uploadPrivateSupplierDocument(
    session.user.tenantId,
    supplier.id,
    file,
  );

  const document = await prisma.supplierDocument.create({
    data: {
      supplierId: supplier.id,
      type: input.type as SupplierDocumentType,
      status: SupplierDocumentStatus.PENDING_VERIFICATION,
      name: file.name,
      blobPathname: blob.pathname,
      storageUrl: blob.url,
      contentType: file.type,
      sizeBytes: file.size,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      actorType: "USER",
      actorId: session.user.id,
      actorLabel: session.user.email,
      action: "supplier_self_service.qualification_document.upload",
      resourceType: "SupplierDocument",
      resourceId: document.id,
      after: {
        supplierId: supplier.id,
        type: input.type,
        name: file.name,
        expiresAt: input.expiresAt ?? null,
        status: SupplierDocumentStatus.PENDING_VERIFICATION,
      },
    },
  });

  revalidatePath("/app/supplier-portal");
  revalidatePath("/app/supplier-portal/documents");
  redirect("/app/supplier-portal/documents?uploaded=1");
}

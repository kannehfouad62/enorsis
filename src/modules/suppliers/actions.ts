"use server";

import { revalidatePath } from "next/cache";
import {
  SupplierQualificationStatus,
  SupplierRiskTier,
  SupplierStatus,
} from "@/generated/prisma/enums";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  createSupplierSchema,
  reviewSupplierSchema,
} from "./schemas";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createSupplierAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = createSupplierSchema.parse({
    legalName: value(formData, "legalName"),
    tradingName: value(formData, "tradingName"),
    countryCode: value(formData, "countryCode"),
    taxIdentificationNo: value(formData, "taxIdentificationNo"),
    website: value(formData, "website"),
    primaryEmail: value(formData, "primaryEmail"),
    primaryPhone: value(formData, "primaryPhone"),
    categories: formData.getAll("categories").map(String).filter(Boolean),
    riskTier: value(formData, "riskTier"),
    diversityOwned: formData.get("diversityOwned") === "on",
    esgCommitted: formData.get("esgCommitted") === "on",
    contactName: value(formData, "contactName"),
    contactTitle: value(formData, "contactTitle"),
    contactEmail: value(formData, "contactEmail"),
    contactPhone: value(formData, "contactPhone"),
  });

  const supplierCount = await prisma.supplier.count({
    where: { tenantId: user.tenantId },
  });
  const supplierNumber = `SUP-${String(supplierCount + 1).padStart(6, "0")}`;

  const supplier = await prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({
      data: {
        tenantId: user.tenantId,
        supplierNumber,
        legalName: input.legalName,
        tradingName: input.tradingName || null,
        countryCode: input.countryCode,
        taxIdentificationNo: input.taxIdentificationNo || null,
        website: input.website || null,
        primaryEmail: input.primaryEmail || null,
        primaryPhone: input.primaryPhone || null,
        categories: input.categories,
        status: SupplierStatus.IN_REVIEW,
        qualificationStatus: SupplierQualificationStatus.IN_PROGRESS,
        riskTier: input.riskTier as SupplierRiskTier,
        diversityOwned: input.diversityOwned ?? false,
        esgCommitted: input.esgCommitted ?? false,
        contacts: {
          create: {
            name: input.contactName,
            title: input.contactTitle || null,
            email: input.contactEmail || null,
            phone: input.contactPhone || null,
            isPrimary: true,
          },
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "supplier.create",
        resourceType: "Supplier",
        resourceId: created.id,
        after: {
          supplierNumber,
          legalName: input.legalName,
          countryCode: input.countryCode,
          riskTier: input.riskTier,
        },
      },
    });

    return created;
  });

  revalidatePath("/app/suppliers");
  revalidatePath(`/app/suppliers/${supplier.id}`);
}

export async function reviewSupplierAction(formData: FormData) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "RISK_COMPLIANCE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = reviewSupplierSchema.parse({
    supplierId: value(formData, "supplierId"),
    decision: value(formData, "decision"),
    qualificationStatus: value(formData, "qualificationStatus"),
    riskTier: value(formData, "riskTier"),
    rejectionReason: value(formData, "rejectionReason"),
  });

  const existing = await prisma.supplier.findFirstOrThrow({
    where: { id: input.supplierId, tenantId: user.tenantId },
  });

  const updated = await prisma.supplier.update({
    where: { id: existing.id },
    data: {
      status: input.decision as SupplierStatus,
      qualificationStatus:
        input.qualificationStatus as SupplierQualificationStatus,
      riskTier: input.riskTier as SupplierRiskTier,
      approvedAt: input.decision === "APPROVED" ? new Date() : null,
      suspendedAt: input.decision === "SUSPENDED" ? new Date() : null,
      rejectionReason:
        input.decision === "REJECTED"
          ? input.rejectionReason || "Supplier did not meet qualification requirements."
          : null,
      sanctionsScreenedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: `supplier.${input.decision.toLowerCase()}`,
      resourceType: "Supplier",
      resourceId: existing.id,
      before: {
        status: existing.status,
        qualificationStatus: existing.qualificationStatus,
        riskTier: existing.riskTier,
      },
      after: {
        status: updated.status,
        qualificationStatus: updated.qualificationStatus,
        riskTier: updated.riskTier,
      },
    },
  });

  revalidatePath("/app/suppliers");
  revalidatePath(`/app/suppliers/${existing.id}`);
}

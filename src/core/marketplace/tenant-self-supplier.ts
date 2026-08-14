import "server-only";

import {
  SupplierQualificationStatus,
  SupplierRiskTier,
  SupplierStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SELLER_PERSONAS = new Set([
  "SUPPLIER",
  "BUYER_SUPPLIER",
]);

function selfSupplierNumber(tenantId: string) {
  return `SELF-${tenantId.slice(0, 24).toUpperCase()}`;
}

export async function ensureTenantSelfSupplierProfile(input: {
  tenantId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
}) {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: {
      id: true,
      name: true,
      legalName: true,
      countryCode: true,
      commercialPersona: true,
    },
  });

  if (!SELLER_PERSONAS.has(tenant.commercialPersona)) {
    throw new Error(
      "Only Supplier and Buyer + Supplier tenants can maintain a marketplace seller identity.",
    );
  }

  const existing = await prisma.supplier.findFirst({
    where: {
      tenantId: tenant.id,
      isTenantSelfProfile: true,
    },
  });

  const legalName =
    tenant.legalName?.trim() || tenant.name;
  const countryCode =
    tenant.countryCode?.trim().toUpperCase() || "US";

  if (existing) {
    if (
      existing.legalName !== legalName ||
      existing.countryCode !== countryCode
    ) {
      return prisma.supplier.update({
        where: { id: existing.id },
        data: {
          legalName,
          countryCode,
        },
      });
    }

    return existing;
  }

  const supplierNumber = selfSupplierNumber(tenant.id);

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        tenantId: tenant.id,
        supplierNumber,
        legalName,
        tradingName: tenant.name,
        countryCode,
        categories: [],
        status: SupplierStatus.APPROVED,
        qualificationStatus:
          SupplierQualificationStatus.QUALIFIED,
        riskTier: SupplierRiskTier.LOW,
        diversityOwned: false,
        esgCommitted: false,
        sanctionsScreenedAt: new Date(),
        approvedAt: new Date(),
        isTenantSelfProfile: true,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        userId: input.actorUserId ?? null,
        actorType: input.actorUserId ? "USER" : "SYSTEM",
        actorId: input.actorUserId ?? null,
        actorLabel:
          input.actorEmail ??
          "Enorsis marketplace identity service",
        action: "marketplace.self-supplier.create",
        resourceType: "Supplier",
        resourceId: supplier.id,
        after: {
          supplierNumber,
          legalName,
          commercialPersona: tenant.commercialPersona,
          isTenantSelfProfile: true,
        },
      },
    });

    return supplier;
  });
}

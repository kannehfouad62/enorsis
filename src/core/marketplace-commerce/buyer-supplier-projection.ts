import "server-only";

import {
  SupplierQualificationStatus,
  SupplierRiskTier,
  SupplierStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function projectionNumber(sellerTenantId: string) {
  return `MKT-${sellerTenantId.slice(-18).toUpperCase()}`;
}

export async function ensureBuyerMarketplaceSupplierProjection(input: {
  buyerTenantId: string;
  sellerTenantId: string;
  sellerSupplierId: string;
}) {
  const seller = await prisma.supplier.findFirstOrThrow({
    where: {
      id: input.sellerSupplierId,
      tenantId: input.sellerTenantId,
      isTenantSelfProfile: true,
    },
    select: {
      legalName: true,
      tradingName: true,
      countryCode: true,
      categories: true,
    },
  });

  const supplierNumber = projectionNumber(input.sellerTenantId);
  const existing = await prisma.supplier.findFirst({
    where: { tenantId: input.buyerTenantId, supplierNumber },
  });

  if (existing) {
    return prisma.supplier.update({
      where: { id: existing.id },
      data: {
        legalName: seller.legalName,
        tradingName: seller.tradingName,
        countryCode: seller.countryCode,
        categories: seller.categories,
      },
    });
  }

  return prisma.supplier.create({
    data: {
      tenantId: input.buyerTenantId,
      supplierNumber,
      legalName: seller.legalName,
      tradingName: seller.tradingName,
      countryCode: seller.countryCode,
      categories: seller.categories,
      status: SupplierStatus.APPROVED,
      qualificationStatus: SupplierQualificationStatus.QUALIFIED,
      riskTier: SupplierRiskTier.LOW,
      diversityOwned: false,
      esgCommitted: false,
      sanctionsScreenedAt: new Date(),
      approvedAt: new Date(),
    },
  });
}

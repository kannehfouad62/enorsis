import { prisma } from "@/lib/prisma";
import { withApiGateway } from "@/core/api-gateway/handler";

export async function GET(request: Request) {
  return withApiGateway({
    request,
    scope: "suppliers:read",
    handler: async (identity) => {
      const suppliers = await prisma.supplier.findMany({
        where: { tenantId: identity.tenantId },
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
          countryCode: true,
          status: true,
          qualificationStatus: true,
          riskTier: true,
          categories: true,
          updatedAt: true,
        },
        orderBy: { legalName: "asc" },
        take: 250,
      });

      return { data: suppliers };
    },
  });
}

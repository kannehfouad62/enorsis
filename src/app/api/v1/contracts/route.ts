import { withApiGateway } from "@/core/api-gateway/handler";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return withApiGateway({
    request,
    scope: "contracts:read",
    handler: async (identity) => {
      const contracts = await prisma.contract.findMany({
        where: { tenantId: identity.tenantId },
        include: {
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });

      return {
        data: contracts.map((contract) => ({
          id: contract.id,
          contractNumber: contract.contractNumber,
          title: contract.title,
          status: contract.status,
          type: contract.type,
          currencyCode: contract.currencyCode,
          totalValue: contract.totalValue?.toString() ?? null,
          startDate: contract.startDate,
          endDate: contract.endDate,
          supplier: contract.supplier,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        })),
      };
    },
  });
}

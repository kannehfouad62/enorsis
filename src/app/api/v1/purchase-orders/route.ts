import { prisma } from "@/lib/prisma";
import { withApiGateway } from "@/core/api-gateway/handler";

export async function GET(request: Request) {
  return withApiGateway({
    request,
    scope: "purchase-orders:read",
    handler: async (identity) => {
      const orders = await prisma.purchaseOrder.findMany({
        where: { tenantId: identity.tenantId },
        include: {
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
            },
          },
          lines: {
            orderBy: { lineNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });

      return {
        data: orders.map((order) => ({
          id: order.id,
          purchaseOrderNumber: order.purchaseOrderNumber,
          status: order.status,
          title: order.title,
          currencyCode: order.currencyCode,
          totalAmount: order.totalAmount.toString(),
          usdEquivalent: order.usdEquivalent.toString(),
          supplier: order.supplier,
          requestedDeliveryDate: order.requestedDeliveryDate,
          lines: order.lines.map((line) => ({
            lineNumber: line.lineNumber,
            description: line.description,
            category: line.category,
            quantity: line.quantity.toString(),
            unitOfMeasure: line.unitOfMeasure,
            unitPrice: line.unitPrice.toString(),
            lineTotal: line.lineTotal.toString(),
          })),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
      };
    },
  });
}

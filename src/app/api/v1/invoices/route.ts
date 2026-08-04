import { withApiGateway } from "@/core/api-gateway/handler";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return withApiGateway({
    request,
    scope: "invoices:read",
    handler: async (identity) => {
      const invoices = await prisma.supplierInvoice.findMany({
        where: { tenantId: identity.tenantId },
        include: {
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
            },
          },
          purchaseOrder: {
            select: { purchaseOrderNumber: true },
          },
          exceptions: {
            where: { status: "OPEN" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });

      return {
        data: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          matchStatus: invoice.matchStatus,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          currencyCode: invoice.currencyCode,
          totalAmount: invoice.totalAmount.toString(),
          usdEquivalent: invoice.usdEquivalent.toString(),
          supplier: invoice.supplier,
          purchaseOrderNumber:
            invoice.purchaseOrder?.purchaseOrderNumber ?? null,
          openExceptionCount: invoice.exceptions.length,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        })),
      };
    },
  });
}

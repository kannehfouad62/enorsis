import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EXCLUDED_SALES_STATUSES = new Set(["DRAFT", "REJECTED", "CANCELLED"]);
const OUTSTANDING_STATUSES = new Set(["SUBMITTED", "MATCHING", "EXCEPTION", "APPROVED", "PAYMENT_READY"]);

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export async function getSupplierFinanceIntelligence() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, commercialPersona: true, baseCurrencyCode: true },
  });

  if (!tenant || !["SUPPLIER", "BUYER_SUPPLIER"].includes(tenant.commercialPersona)) {
    redirect("/app/unauthorized");
  }

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      generatedBySellerTenantId: tenant.id,
      sourceMarketplaceOrderId: { not: null },
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      invoiceDate: true,
      dueDate: true,
      currencyCode: true,
      totalAmount: true,
      sourceMarketplaceOrderId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { invoiceDate: "desc" },
    take: 1000,
  });

  const invoiceIds = invoices.map((invoice) => invoice.id);

  const paidItems = invoiceIds.length
    ? await prisma.paymentBatchItem.findMany({
        where: {
          supplierInvoiceId: { in: invoiceIds },
          status: "PAID",
          paymentBatch: {
            status: "COMPLETED",
          },
        },
        include: {
          paymentBatch: {
            select: {
              id: true,
              batchNumber: true,
              currencyCode: true,
              exportReference: true,
              completedAt: true,
            },
          },
          supplierInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
        orderBy: {
          paidAt: "desc",
        },
        take: 200,
      })
    : [];

  const remittanceMap = new Map<
    string,
    {
      batchId: string;
      batchNumber: string;
      currencyCode: string;
      paymentReference: string | null;
      completedAt: Date | null;
      amount: number;
      invoiceCount: number;
    }
  >();

  for (const item of paidItems) {
    const current = remittanceMap.get(
      item.paymentBatchId,
    ) ?? {
      batchId: item.paymentBatch.id,
      batchNumber: item.paymentBatch.batchNumber,
      currencyCode: item.paymentBatch.currencyCode,
      paymentReference:
        item.paymentBatch.exportReference,
      completedAt: item.paymentBatch.completedAt,
      amount: 0,
      invoiceCount: 0,
    };

    current.amount += Number(item.amount);
    current.invoiceCount += 1;
    remittanceMap.set(item.paymentBatchId, current);
  }

  const remittances = [...remittanceMap.values()]
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) -
        (a.completedAt?.getTime() ?? 0),
    )
    .slice(0, 20);

  const orderIds = invoices.map((invoice) => invoice.sourceMarketplaceOrderId).filter((id): id is string => Boolean(id));
  const orders = orderIds.length
    ? await prisma.marketplaceSellerOrder.findMany({
        where: { id: { in: orderIds }, sellerTenantId: tenant.id },
        select: { id: true, buyerTenantId: true, buyerTenantName: true, orderNumber: true },
      })
    : [];

  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const rows = invoices.map((invoice) => {
    const order = invoice.sourceMarketplaceOrderId ? orderMap.get(invoice.sourceMarketplaceOrderId) : null;
    return {
      ...invoice,
      buyerTenantId: order?.buyerTenantId ?? "unknown",
      buyerName: order?.buyerTenantName ?? "Marketplace buyer",
      orderNumber: order?.orderNumber ?? "—",
      amount: Number(invoice.totalAmount),
    };
  });

  const salesRows = rows.filter((invoice) => !EXCLUDED_SALES_STATUSES.has(invoice.status));
  const paidRows = rows.filter((invoice) => invoice.status === "PAID");
  const outstandingRows = rows.filter((invoice) => OUTSTANDING_STATUSES.has(invoice.status));
  const draftRows = rows.filter((invoice) => invoice.status === "DRAFT");
  const now = new Date();
  const overdueRows = outstandingRows.filter((invoice) => invoice.dueDate && invoice.dueDate.getTime() < now.getTime());
  const sum = (items: typeof rows) => items.reduce((total, item) => total + item.amount, 0);

  const invoicedSales = sum(salesRows);
  const paidRevenue = sum(paidRows);
  const outstandingReceivables = sum(outstandingRows);
  const draftPipeline = sum(draftRows);
  const overdueReceivables = sum(overdueRows);
  const collectionRate = invoicedSales > 0 ? (paidRevenue / invoicedSales) * 100 : 0;
  const averageInvoice = salesRows.length > 0 ? invoicedSales / salesRows.length : 0;

  const months: Date[] = [];
  const monthCursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  for (let i = 0; i < 12; i += 1) {
    months.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + i, 1));
  }

  const monthlyMap = new Map(months.map((month) => [monthKey(month), { month: monthLabel(month), invoiced: 0, paid: 0, invoiceCount: 0 }]));
  for (const invoice of rows) {
    const bucket = monthlyMap.get(monthKey(invoice.invoiceDate));
    if (!bucket) continue;
    if (!EXCLUDED_SALES_STATUSES.has(invoice.status)) {
      bucket.invoiced += invoice.amount;
      bucket.invoiceCount += 1;
    }
    if (invoice.status === "PAID") bucket.paid += invoice.amount;
  }

  const statusMap = new Map<string, { status: string; count: number; value: number }>();
  for (const invoice of rows) {
    const existing = statusMap.get(invoice.status) ?? { status: invoice.status.replaceAll("_", " "), count: 0, value: 0 };
    existing.count += 1;
    existing.value += invoice.amount;
    statusMap.set(invoice.status, existing);
  }

  const aging = [
    { bucket: "Current", value: 0, count: 0 },
    { bucket: "1–30 days", value: 0, count: 0 },
    { bucket: "31–60 days", value: 0, count: 0 },
    { bucket: "61–90 days", value: 0, count: 0 },
    { bucket: "90+ days", value: 0, count: 0 },
  ];

  for (const invoice of outstandingRows) {
    if (!invoice.dueDate) {
      aging[0].value += invoice.amount;
      aging[0].count += 1;
      continue;
    }
    const days = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000));
    const index = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    aging[index].value += invoice.amount;
    aging[index].count += 1;
  }

  const buyerMap = new Map<string, { buyer: string; invoiced: number; paid: number; outstanding: number }>();
  for (const invoice of salesRows) {
    const item = buyerMap.get(invoice.buyerTenantId) ?? { buyer: invoice.buyerName, invoiced: 0, paid: 0, outstanding: 0 };
    item.invoiced += invoice.amount;
    if (invoice.status === "PAID") item.paid += invoice.amount;
    if (OUTSTANDING_STATUSES.has(invoice.status)) item.outstanding += invoice.amount;
    buyerMap.set(invoice.buyerTenantId, item);
  }

  const buyers = [...buyerMap.values()].sort((a, b) => b.invoiced - a.invoiced).slice(0, 10);
  const topBuyerShare = invoicedSales > 0 && buyers[0] ? (buyers[0].invoiced / invoicedSales) * 100 : 0;
  const insights: Array<{ severity: "INFO" | "WATCH" | "ACTION"; title: string; message: string }> = [];

  if (overdueReceivables > 0) {
    insights.push({
      severity: "ACTION",
      title: "Collections attention required",
      message: `${overdueRows.length} invoice(s) totaling ${tenant.baseCurrencyCode} ${overdueReceivables.toLocaleString()} are past due.`,
    });
  }
  if (collectionRate < 70 && invoicedSales > 0) {
    insights.push({
      severity: "WATCH",
      title: "Collection conversion is below 70%",
      message: "Review invoice exceptions, payment-readiness blockers and buyer follow-up cadence to improve cash conversion.",
    });
  }
  if (topBuyerShare >= 50) {
    insights.push({
      severity: "WATCH",
      title: "Buyer concentration is elevated",
      message: `${buyers[0]?.buyer ?? "Your largest buyer"} represents ${topBuyerShare.toFixed(1)}% of invoiced sales. Diversification may reduce revenue concentration risk.`,
    });
  }
  if (draftPipeline > 0) {
    insights.push({
      severity: "INFO",
      title: "Draft revenue pipeline available",
      message: `${tenant.baseCurrencyCode} ${draftPipeline.toLocaleString()} is currently held in supplier-private draft invoices awaiting review/submission.`,
    });
  }
  if (insights.length === 0) {
    insights.push({
      severity: "INFO",
      title: "No immediate finance exceptions detected",
      message: "Continue monitoring collections, buyer concentration and payment-readiness progression as invoice volume grows.",
    });
  }

  return {
    tenant,
    metrics: {
      invoicedSales,
      paidRevenue,
      outstandingReceivables,
      overdueReceivables,
      draftPipeline,
      collectionRate,
      averageInvoice,
      invoiceCount: rows.length,
      paidInvoiceCount: paidRows.length,
    },
    monthly: [...monthlyMap.values()],
    statuses: [...statusMap.values()].sort((a, b) => b.value - a.value),
    aging,
    buyers,
    insights,
    recentInvoices: rows.slice(0, 20),
    remittances,
  };
}

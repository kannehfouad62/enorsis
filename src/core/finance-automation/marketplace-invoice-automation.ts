import "server-only";

import { get, put } from "@vercel/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createEnterpriseNotification } from "@/core/notifications";
import {
  assessPaymentReadiness,
} from "@/core/requisition-to-order/payment-readiness";
import {
  approveThreeWayMatchForPayment,
  createThreeWayMatchCase,
} from "@/core/requisition-to-order/three-way-match";
import { prisma } from "@/lib/prisma";

type LineSnapshot = {
  description?: string;
  offeringName?: string;
  quantity?: number;
  unitPrice?: number;
  unitOfMeasure?: string;
};

async function notifyFinance(input: {
  tenantId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl: string;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: input.tenantId,
      status: "ACTIVE",
      roles: {
        hasSome: [
          "ACCOUNTS_PAYABLE",
          "FINANCE",
          "TENANT_ADMIN",
          "TENANT_OWNER",
        ],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    take: 100,
  });

  await Promise.allSettled(
    memberships.map((membership) =>
      createEnterpriseNotification({
        tenantId: input.tenantId,
        eventType: input.eventType,
        recipientUserId: membership.user.id,
        recipientAddress: membership.user.email ?? undefined,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        channels: membership.user.email
          ? ["IN_APP", "EMAIL"]
          : ["IN_APP"],
        priority: "HIGH",
      }),
    ),
  );
}

function money(value: number, currency: string) {
  return `${currency} ${value.toFixed(2)}`;
}

async function logoBytes(
  pathname: string | null,
  contentType: string | null,
) {
  if (
    !pathname ||
    !contentType ||
    !["image/png", "image/jpeg"].includes(contentType)
  ) {
    return null;
  }

  try {
    const blob = await get(pathname, { access: "private" });
    if (!blob?.stream) return null;
    return {
      contentType,
      bytes: await new Response(blob.stream).arrayBuffer(),
    };
  } catch {
    return null;
  }
}

async function buildPdf(input: {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  currencyCode: string;
  sellerName: string;
  sellerLegalName: string;
  sellerTaxId: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  sellerWebsite: string | null;
  buyerName: string;
  orderNumber: string;
  receiptNumber: string;
  carrier: string | null;
  trackingNumber: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  freightAmount: number;
  discountAmount: number;
  totalAmount: number;
  logoPathname: string | null;
  logoContentType: string | null;
}) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (
    text: string,
    x: number,
    y: number,
    size = 9,
    strong = false,
  ) => {
    page.drawText(text.slice(0, 95), {
      x,
      y,
      size,
      font: strong ? bold : regular,
      color: rgb(0.08, 0.12, 0.2),
    });
  };

  const logo = await logoBytes(
    input.logoPathname,
    input.logoContentType,
  );

  if (logo) {
    try {
      const image =
        logo.contentType === "image/png"
          ? await pdf.embedPng(logo.bytes)
          : await pdf.embedJpg(logo.bytes);
      const dims = image.scale(0.18);
      page.drawImage(image, {
        x: 48,
        y: 700,
        width: Math.min(dims.width, 110),
        height: Math.min(dims.height, 70),
      });
    } catch {
      // Text branding remains if the stored logo cannot be embedded.
    }
  }

  draw(input.sellerName, 48, 680, 18, true);
  if (input.sellerLegalName !== input.sellerName) {
    draw(input.sellerLegalName, 48, 663, 9);
  }
  draw(
    input.sellerTaxId
      ? `Tax ID: ${input.sellerTaxId}`
      : "Tax ID: Not provided",
    48,
    648,
    9,
  );
  draw(
    [input.sellerEmail, input.sellerPhone, input.sellerWebsite]
      .filter(Boolean)
      .join(" | "),
    48,
    634,
    8,
  );

  draw("INVOICE", 440, 700, 22, true);
  draw(input.invoiceNumber, 440, 680, 10, true);
  draw(
    `Invoice date: ${input.invoiceDate.toLocaleDateString("en-US")}`,
    440,
    664,
    8,
  );
  draw(
    `Due date: ${input.dueDate.toLocaleDateString("en-US")}`,
    440,
    650,
    8,
  );

  draw(`Bill to: ${input.buyerName}`, 48, 600, 11, true);
  draw(`PO: ${input.orderNumber}`, 48, 582, 9);
  draw(`Goods receipt: ${input.receiptNumber}`, 48, 568, 9);
  draw(
    `Shipment: ${
      [input.carrier, input.trackingNumber]
        .filter(Boolean)
        .join(" / ") || "Not provided"
    }`,
    48,
    554,
    9,
  );

  let y = 520;
  draw("Description", 48, y, 9, true);
  draw("Qty", 330, y, 9, true);
  draw("Unit price", 390, y, 9, true);
  draw("Amount", 500, y, 9, true);
  y -= 18;

  for (const line of input.lines) {
    if (y < 120) {
      page = pdf.addPage([612, 792]);
      y = 740;
    }

    draw(line.description, 48, y, 8);
    draw(
      `${line.quantity} ${line.unitOfMeasure}`,
      330,
      y,
      8,
    );
    draw(money(line.unitPrice, input.currencyCode), 390, y, 8);
    draw(money(line.lineTotal, input.currencyCode), 500, y, 8);
    y -= 17;
  }

  y -= 16;
  draw(
    `Subtotal: ${money(input.subtotal, input.currencyCode)}`,
    390,
    y,
    9,
  );
  y -= 15;
  draw(
    `Tax: ${money(input.taxAmount, input.currencyCode)}`,
    390,
    y,
    9,
  );
  y -= 15;
  draw(
    `Freight / shipping: ${money(
      input.freightAmount,
      input.currencyCode,
    )}`,
    390,
    y,
    9,
  );
  y -= 15;
  draw(
    `Discount: -${money(
      input.discountAmount,
      input.currencyCode,
    )}`,
    390,
    y,
    9,
  );
  y -= 20;
  draw(
    `Total: ${money(input.totalAmount, input.currencyCode)}`,
    390,
    y,
    12,
    true,
  );

  draw(
    "Generated by Enorsis from governed purchase, shipment and receipt records.",
    48,
    52,
    8,
  );

  return pdf.save();
}

export async function generateMarketplaceInvoiceFromReceivedOrder(
  input: {
    orderId: string;
    sellerTenantId: string;
    actorUserId: string;
    actorEmail?: string | null;
  },
) {
  const order = await prisma.marketplaceSellerOrder.findFirstOrThrow({
    where: {
      id: input.orderId,
      sellerTenantId: input.sellerTenantId,
    },
  });

  if (!order.purchaseOrderExecutionId || !order.buyerSupplierId) {
    throw new Error(
      "This order is missing its governed buyer purchase-order linkage.",
    );
  }

  const existing = await prisma.supplierInvoice.findUnique({
    where: {
      sourceMarketplaceOrderId: order.id,
    },
  });
  if (existing) return existing;

  const [execution, request, seller, buyer] = await Promise.all([
    prisma.purchaseOrderExecution.findUniqueOrThrow({
      where: {
        id: order.purchaseOrderExecutionId,
      },
      include: {
        revisions: true,
        goodsReceiptSessions: {
          where: {
            status: "FULLY_ACCEPTED",
          },
          include: {
            lines: true,
          },
          orderBy: {
            receivedAt: "desc",
          },
          take: 1,
        },
      },
    }),
    prisma.purchaseRequest.findUniqueOrThrow({
      where: {
        id: order.purchaseRequestId,
      },
    }),
    prisma.supplier.findFirstOrThrow({
      where: {
        tenantId: input.sellerTenantId,
        isTenantSelfProfile: true,
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: {
        id: order.buyerTenantId,
      },
      select: {
        name: true,
      },
    }),
  ]);

  if (execution.status !== "FULLY_RECEIVED") {
    throw new Error(
      "The buyer must fully receive the shipment before an invoice can be generated.",
    );
  }

  const receipt = execution.goodsReceiptSessions[0];
  if (!receipt) {
    throw new Error(
      "No fully accepted buyer goods receipt is available for this order.",
    );
  }

  const revision = execution.revisions.find(
    (item) =>
      item.revisionNumber === execution.currentRevision,
  );

  if (!revision) {
    throw new Error(
      "The current governed purchase-order revision was not found.",
    );
  }

  const snapshot = Array.isArray(revision.lineSnapshot)
    ? (revision.lineSnapshot as LineSnapshot[])
    : Array.isArray(order.lineSnapshot)
      ? (order.lineSnapshot as LineSnapshot[])
      : [];

  const lines = snapshot
    .map((line, index) => {
      const quantity = Number(line.quantity ?? 0);
      const unitPrice = Number(line.unitPrice ?? 0);
      return {
        lineNumber: index + 1,
        description:
          line.description ??
          line.offeringName ??
          `Order line ${index + 1}`,
        quantity,
        unitOfMeasure: line.unitOfMeasure ?? "EA",
        unitPrice,
        lineTotal: quantity * unitPrice,
      };
    })
    .filter((line) => line.quantity > 0);

  if (lines.length === 0) {
    throw new Error(
      "The purchase order has no invoiceable line items.",
    );
  }

  const subtotal = Number(revision.subtotalAmount);
  const taxAmount = Number(execution.taxAmount);
  const freightAmount = Number(execution.freightAmount);
  const discountAmount = Number(execution.discountAmount);
  const totalAmount = Number(execution.totalAmount);
  const invoiceDate = new Date();
  const dueDate = new Date(
    invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const invoiceNumber =
    `INV-${invoiceDate.getFullYear()}-${order.id
      .slice(-8)
      .toUpperCase()}`;

  const invoice = await prisma.supplierInvoice.create({
    data: {
      tenantId: order.buyerTenantId,
      supplierId: order.buyerSupplierId,
      purchaseOrderId: null,
      invoiceNumber,
      status: "SUBMITTED",
      matchStatus: "NOT_MATCHED",
      invoiceDate,
      dueDate,
      currencyCode: execution.currencyCode,
      subtotal,
      taxAmount,
      totalAmount,
      usdEquivalent:
        totalAmount * Number(request.exchangeRateToUsd),
      exchangeRateToUsd: request.exchangeRateToUsd,
      exchangeRateSource: request.exchangeRateSource,
      exchangeRateDate: request.exchangeRateDate,
      sourceMarketplaceOrderId: order.id,
      sourcePurchaseOrderExecutionId: execution.id,
      generatedBySellerTenantId: input.sellerTenantId,
      submittedAt: invoiceDate,
      lines: {
        create: lines.map((line) => ({
          purchaseOrderLineId: null,
          lineNumber: line.lineNumber,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
      },
    },
  });

  try {
    const pdf = await buildPdf({
      invoiceNumber,
      invoiceDate,
      dueDate,
      currencyCode: execution.currencyCode,
      sellerName: seller.tradingName ?? seller.legalName,
      sellerLegalName: seller.legalName,
      sellerTaxId: seller.taxIdentificationNo,
      sellerEmail: seller.primaryEmail,
      sellerPhone: seller.primaryPhone,
      sellerWebsite: seller.website,
      buyerName: buyer.name,
      orderNumber: execution.orderNumber,
      receiptNumber: receipt.receiptNumber,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      lines,
      subtotal,
      taxAmount,
      freightAmount,
      discountAmount,
      totalAmount,
      logoPathname: seller.marketplaceLogoPathname,
      logoContentType: seller.marketplaceLogoContentType,
    });

    const fileName = `${invoiceNumber}.pdf`;
    const pathname =
      `tenants/${order.buyerTenantId}/invoices/${invoice.id}/${fileName}`;

    const blob = await put(pathname, Buffer.from(pdf), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/pdf",
    });

    await prisma.supplierInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        pdfBlobPathname: blob.pathname,
        pdfFileName: fileName,
        pdfGeneratedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Generated invoice PDF failed", {
      invoiceId: invoice.id,
      orderId: order.id,
      error,
    });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: order.buyerTenantId,
      userId: input.actorUserId,
      actorType: "USER",
      actorId: input.actorUserId,
      actorLabel: input.actorEmail ?? undefined,
      action: "marketplace.invoice.generated_by_supplier",
      resourceType: "SupplierInvoice",
      resourceId: invoice.id,
      after: {
        invoiceNumber,
        marketplaceOrderId: order.id,
        purchaseOrderExecutionId: execution.id,
        receiptNumber: receipt.receiptNumber,
        freightAmount,
        totalAmount,
      },
    },
  });

  await notifyFinance({
    tenantId: order.buyerTenantId,
    eventType: "AccountsPayable.SupplierInvoiceSubmitted",
    title: "Supplier invoice submitted",
    message:
      `${invoiceNumber} for ${execution.orderNumber} was generated from the verified receipt and submitted for acknowledgement.`,
    actionUrl: `/app/purchasing/invoices/${invoice.id}`,
  });

  return prisma.supplierInvoice.findUniqueOrThrow({
    where: {
      id: invoice.id,
    },
  });
}

export async function acknowledgeAndAdvanceMarketplaceInvoice(
  input: {
    invoiceId: string;
    buyerTenantId: string;
    actorUserId: string;
  },
) {
  const invoice = await prisma.supplierInvoice.findFirstOrThrow({
    where: {
      id: input.invoiceId,
      tenantId: input.buyerTenantId,
    },
    include: {
      supplier: true,
      lines: true,
    },
  });

  if (
    !invoice.sourcePurchaseOrderExecutionId ||
    !invoice.sourceMarketplaceOrderId
  ) {
    throw new Error(
      "This is not a governed marketplace-generated invoice.",
    );
  }

  if (invoice.buyerAcknowledgedAt) {
    return invoice;
  }

  const execution =
    await prisma.purchaseOrderExecution.findUniqueOrThrow({
      where: {
        id: invoice.sourcePurchaseOrderExecutionId,
      },
      include: {
        goodsReceiptSessions: {
          where: {
            status: "FULLY_ACCEPTED",
          },
          include: {
            lines: true,
          },
          orderBy: {
            receivedAt: "desc",
          },
          take: 1,
        },
      },
    });

  if (
    execution.tenantId !== input.buyerTenantId ||
    execution.status !== "FULLY_RECEIVED"
  ) {
    throw new Error(
      "The linked purchase order is not fully received.",
    );
  }

  const receipt = execution.goodsReceiptSessions[0];
  if (!receipt) {
    throw new Error(
      "No fully accepted receipt is available.",
    );
  }

  let matchCase = await prisma.threeWayMatchCase.findFirst({
    where: {
      supplierInvoiceId: invoice.id,
      purchaseOrderExecutionId: execution.id,
    },
  });

  if (!matchCase) {
    const invoicedQuantity = invoice.lines.reduce(
      (sum, line) => sum + Number(line.quantity),
      0,
    );

    matchCase = await createThreeWayMatchCase({
      purchaseOrderExecutionId: execution.id,
      goodsReceiptSessionId: receipt.id,
      supplierInvoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: Number(invoice.totalAmount),
      invoicedQuantity,
      invoiceUnitPrice:
        invoicedQuantity > 0
          ? Number(invoice.totalAmount) / invoicedQuantity
          : Number(invoice.totalAmount),
      lineReference: execution.orderNumber,
      lineDescription:
        `Generated supplier invoice ${invoice.invoiceNumber}`,
      amountTolerancePercent: 0,
      quantityTolerancePercent: 0,
      actorUserId: input.actorUserId,
    });
  }

  await prisma.supplierInvoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      buyerAcknowledgedAt: new Date(),
      buyerAcknowledgedByUserId: input.actorUserId,
      status:
        matchCase.status === "EXCEPTION"
          ? "EXCEPTION"
          : "MATCHING",
      matchStatus:
        matchCase.status === "EXCEPTION"
          ? "EXCEPTION"
          : "MATCHED",
    },
  });

  if (
    ["MATCHED", "MATCHED_WITH_WARNINGS"].includes(
      matchCase.status,
    )
  ) {
    const approvedMatch =
      await approveThreeWayMatchForPayment({
        matchCaseId: matchCase.id,
        actorUserId: input.actorUserId,
      });

    const duplicate = await prisma.supplierInvoice.count({
      where: {
        tenantId: invoice.tenantId,
        supplierId: invoice.supplierId,
        invoiceNumber: invoice.invoiceNumber,
        id: {
          not: invoice.id,
        },
      },
    });

    const bankingVerification = await prisma.supplierBankingVerification.findFirst({
      where: {
        buyerTenantId: invoice.tenantId,
        sellerTenantId: invoice.generatedBySellerTenantId ?? undefined,
        buyerSupplierId: invoice.supplierId,
        status: "VERIFIED",
      },
    });

    const readiness = await assessPaymentReadiness({
      threeWayMatchCaseId: approvedMatch.id,
      supplierInvoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      dueDate: invoice.dueDate,
      bankDetailsVerified: Boolean(bankingVerification),
      supplierCompliant:
        invoice.supplier.status === "APPROVED",
      taxValidated: Boolean(
        invoice.supplier.taxIdentificationNo,
      ),
      duplicateInvoiceDetected: duplicate > 0,
      actorUserId: input.actorUserId,
    });

    await prisma.supplierInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status:
          readiness.status === "READY"
            ? "APPROVED"
            : "EXCEPTION",
        approvedAt:
          readiness.status === "READY"
            ? new Date()
            : null,
      },
    });

    await notifyFinance({
      tenantId: invoice.tenantId,
      eventType:
        "AccountsPayable.PaymentReadinessReviewRequired",
      title:
        readiness.status === "READY"
          ? "Invoice ready for finance approval"
          : "Invoice payment readiness requires review",
      message:
        `${invoice.invoiceNumber} passed buyer acknowledgement and three-way matching. Review payment-readiness controls to continue payment processing.`,
      actionUrl:
        "/app/requisition-to-order/payment-readiness",
    });
  } else {
    await notifyFinance({
      tenantId: invoice.tenantId,
      eventType: "InvoiceMatch.ExceptionsDetected",
      title: "Invoice match exceptions require review",
      message:
        `${invoice.invoiceNumber} has a three-way-match exception and requires finance/AP review.`,
      actionUrl:
        `/app/purchasing/invoices/${invoice.id}`,
    });
  }

  return prisma.supplierInvoice.findUniqueOrThrow({
    where: {
      id: invoice.id,
    },
  });
}

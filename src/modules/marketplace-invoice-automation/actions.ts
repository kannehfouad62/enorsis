"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import {
  acknowledgeAndAdvanceMarketplaceInvoice,
  generateMarketplaceInvoiceFromReceivedOrder,
  submitMarketplaceInvoiceToBuyer,
} from "@/core/finance-automation/marketplace-invoice-automation";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateMarketplaceSupplierInvoiceAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "SUPPLIER_MANAGER",
  ]);

  let invoiceNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const invoice = await generateMarketplaceInvoiceFromReceivedOrder({
      orderId: field(data, "orderId"),
      sellerTenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
    });

    invoiceNumber = invoice.invoiceNumber;
    revalidatePath("/app/marketplace/orders");
  } catch (error) {
    console.error("Marketplace invoice generation failed", {
      orderId: field(data, "orderId"),
      sellerTenantId: user.tenantId,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "Invoice generation failed.";
  }

  if (errorMessage) {
    redirect(
      `/app/marketplace/orders?invoiceError=${encodeURIComponent(
        errorMessage,
      )}`,
    );
  }

  if (!invoiceNumber) {
    redirect(
      "/app/marketplace/orders?invoiceError=Invoice%20generation%20did%20not%20return%20an%20invoice%20number.",
    );
  }

  redirect(
    `/app/marketplace/orders?invoiceGenerated=${encodeURIComponent(
      invoiceNumber,
    )}`,
  );
}

export async function submitMarketplaceSupplierInvoiceAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "SUPPLIER_MANAGER",
  ]);

  const invoiceId = field(data, "invoiceId");
  let invoiceNumber: string | null = null;
  let errorMessage: string | null = null;

  try {
    const invoice = await submitMarketplaceInvoiceToBuyer({
      invoiceId,
      sellerTenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
    });

    invoiceNumber = invoice.invoiceNumber;
    revalidatePath("/app/marketplace/orders");
  } catch (error) {
    console.error("Marketplace invoice submission failed", {
      invoiceId,
      sellerTenantId: user.tenantId,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "Invoice submission failed.";
  }

  if (errorMessage) {
    redirect(
      `/app/marketplace/orders?invoiceError=${encodeURIComponent(
        errorMessage,
      )}`,
    );
  }

  redirect(
    `/app/marketplace/orders?invoiceSubmitted=${encodeURIComponent(
      invoiceNumber ?? "Invoice",
    )}`,
  );
}

export async function acknowledgeMarketplaceSupplierInvoiceAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "ACCOUNTS_PAYABLE",
    "FINANCE",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const invoiceId = field(data, "invoiceId");
  let errorMessage: string | null = null;

  try {
    await acknowledgeAndAdvanceMarketplaceInvoice({
      invoiceId,
      buyerTenantId: user.tenantId,
      actorUserId: user.id,
    });

    revalidatePath(`/app/purchasing/invoices/${invoiceId}`);
    revalidatePath("/app/purchasing/invoices");
    revalidatePath("/app/requisition-to-order/payment-readiness");
  } catch (error) {
    console.error("Marketplace invoice acknowledgement failed", {
      invoiceId,
      buyerTenantId: user.tenantId,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "Invoice acknowledgement failed.";
  }

  if (errorMessage) {
    redirect(
      `/app/purchasing/invoices/${invoiceId}?error=${encodeURIComponent(
        errorMessage,
      )}`,
    );
  }

  redirect(`/app/purchasing/invoices/${invoiceId}?acknowledged=1`);
}

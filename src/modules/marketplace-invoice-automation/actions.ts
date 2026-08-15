"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import {
  acknowledgeAndAdvanceMarketplaceInvoice,
  generateMarketplaceInvoiceFromReceivedOrder,
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

  let invoiceNumber: string;

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
    const message =
      error instanceof Error
        ? error.message
        : "Invoice generation failed.";

    redirect(
      `/app/marketplace/orders?invoiceError=${encodeURIComponent(
        message,
      )}`,
    );
  }

  redirect(
    `/app/marketplace/orders?invoiceGenerated=${encodeURIComponent(
      invoiceNumber,
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
    const message =
      error instanceof Error
        ? error.message
        : "Invoice acknowledgement failed.";

    redirect(
      `/app/purchasing/invoices/${invoiceId}?error=${encodeURIComponent(
        message,
      )}`,
    );
  }

  redirect(`/app/purchasing/invoices/${invoiceId}?acknowledged=1`);
}

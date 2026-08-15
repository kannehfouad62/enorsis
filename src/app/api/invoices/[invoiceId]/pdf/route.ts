import { get } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ invoiceId: string }>;
  },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { invoiceId } = await params;
  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      tenantId: true,
      generatedBySellerTenantId: true,
      pdfBlobPathname: true,
      pdfFileName: true,
    },
  });

  const platform = session.user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );

  if (
    !invoice ||
    !invoice.pdfBlobPathname ||
    !(
      invoice.tenantId === session.user.tenantId ||
      invoice.generatedBySellerTenantId === session.user.tenantId ||
      platform
    )
  ) {
    return new Response("Not found", { status: 404 });
  }

  const blob = await get(invoice.pdfBlobPathname, {
    access: "private",
  });

  if (!blob?.stream) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `inline; filename="${invoice.pdfFileName ?? "invoice.pdf"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

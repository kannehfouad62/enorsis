import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export function hashSupplierPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireSupplierPortalAccess(
  token: string,
) {
  const tokenHash = hashSupplierPortalToken(token);

  const invitation =
    await prisma.supplierPortalInvitation.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });

  if (!invitation?.supplierId) notFound();

  const supplierId = invitation.supplierId;

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      tenantId: invitation.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
      status: true,
    },
  });

  if (!supplier) notFound();

  const portalUser = await prisma.supplierPortalUser.findFirst({
    where: {
      tenantId: invitation.tenantId,
      supplierId,
      email: invitation.email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      jobTitle: true,
      status: true,
    },
  });

  if (!portalUser) notFound();

  return {
    token,
    invitation,
    supplier,
    portalUser,
  };
}

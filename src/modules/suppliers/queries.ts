import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });

  if (!tenant) redirect("/app/settings/organization");

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { session, tenant, suppliers };
}

export async function getSupplierDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!supplier) redirect("/app/suppliers");
  return { session, supplier };
}

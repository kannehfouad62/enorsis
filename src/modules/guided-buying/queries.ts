import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getGuidedBuyingWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [catalogs, suppliers, cart] = await Promise.all([
    prisma.procurementCatalog.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        items: {
          where: { status: "ACTIVE" },
          orderBy: [{ preferred: "desc" }, { name: "asc" }],
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
    prisma.guidedCart.findFirst({
      where: {
        tenantId,
        requesterUserId: session.user.id,
        status: "DRAFT",
      },
      include: {
        items: {
          include: { catalogItem: { include: { catalog: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    catalogs,
    suppliers,
    cart,
    metrics: {
      activeCatalogs: catalogs.filter((catalog) => catalog.status === "ACTIVE").length,
      activeItems: catalogs.reduce((sum, catalog) => sum + catalog.items.length, 0),
      preferredItems: catalogs.reduce(
        (sum, catalog) => sum + catalog.items.filter((item) => item.preferred).length,
        0,
      ),
      cartItems: cart?.items.length ?? 0,
      cartTotal: Number(cart?.totalAmount ?? 0),
    },
  };
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SupplierCommandCenter } from "@/components/command-center/SupplierCommandCenter";
import { BuyerCommandCenter } from "@/components/command-center/BuyerCommandCenter";
import { getSidebarActionCountsForUser } from "@/modules/navigation/sidebar-action-counts";
import {
  getBuyerCommandCenterData,
} from "@/modules/command-center/queries";

export default async function CommandCenterPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const tenant =
    await prisma.tenant.findUnique({
      where: {
        id: session.user.tenantId,
      },
      select: {
        name: true,
        commercialPersona: true,
      },
    });

  if (!tenant) {
    redirect("/app/settings/organization");
  }

  if (
    tenant.commercialPersona === "SUPPLIER"
  ) {
    const actionCounts =
      await getSidebarActionCountsForUser({
        id: session.user.id,
        tenantId: session.user.tenantId,
        roles: session.user.roles,
        commercialPersona:
          tenant.commercialPersona,
      });

    return (
      <SupplierCommandCenter
        tenantName={tenant.name}
        actionCounts={actionCounts}
      />
    );
  }

  const data =
    await getBuyerCommandCenterData({
      id: session.user.id,
      tenantId: session.user.tenantId,
      name: session.user.name,
      email: session.user.email,
      roles: session.user.roles,
      commercialPersona:
        tenant.commercialPersona,
    });

  return (
    <BuyerCommandCenter
      initialData={data}
    />
  );
}

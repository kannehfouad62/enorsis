import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/prisma";
import { getSidebarActionCountsForUser } from "@/modules/navigation/sidebar-action-counts";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const tenant = session.user.tenantId
    ? await prisma.tenant.findUnique({
        where: {
          id: session.user.tenantId,
        },
        select: {
          commercialPersona: true,
        },
      })
    : null;

  const sidebarActionCounts = await getSidebarActionCountsForUser({
    id: session.user.id,
    tenantId: session.user.tenantId,
    roles: session.user.roles,
  });

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        tenantName: session.user.tenantName,
        roles: session.user.roles,
        mustChangePassword: session.user.mustChangePassword,
        commercialPersona:
          tenant?.commercialPersona ?? "BUYER",
      }}
      actionCounts={sidebarActionCounts}
    >
      {children}
    </AppShell>
  );
}
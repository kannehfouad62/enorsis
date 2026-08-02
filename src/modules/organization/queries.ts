import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getOrganizationWorkspace() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    throw new Error("Authentication is required.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      legalEntities: {
        orderBy: { name: "asc" },
      },
      sites: {
        orderBy: { name: "asc" },
      },
      departments: {
        orderBy: { name: "asc" },
      },
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    session,
    tenant,
  };
}

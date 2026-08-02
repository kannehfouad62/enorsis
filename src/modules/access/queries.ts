import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAccessAdministrationWorkspace() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    throw new Error("Authentication is required.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      legalEntities: { orderBy: { name: "asc" } },
      sites: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" } },
    },
  });

  if (!tenant) {
    throw new Error("Activate the organization before managing access.");
  }

  return { session, tenant };
}

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getBankStatementMappingProfiles() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "FINANCE",
      "ACCOUNTS_PAYABLE",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  return prisma.bankStatementMappingProfile.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    orderBy: [
      { active: "desc" },
      { name: "asc" },
    ],
  });
}

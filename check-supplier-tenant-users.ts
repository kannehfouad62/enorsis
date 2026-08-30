import { prisma } from "./src/lib/prisma";

async function main() {
  const memberships = await prisma.membership.findMany({
    where: {
      tenant: {
        commercialPersona: "SUPPLIER",
      },
    },
    select: {
      id: true,
      status: true,
      roles: true,
      jobTitle: true,
      activatedAt: true,
      lastActiveAt: true,
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          commercialPersona: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          mustChangePassword: true,
          passwordHash: true,
        },
      },
    },
    orderBy: [
      {
        tenant: {
          name: "asc",
        },
      },
      {
        user: {
          email: "asc",
        },
      },
    ],
  });

  console.table(
    memberships.map((membership) => ({
      tenant: membership.tenant.name,
      tenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      persona: membership.tenant.commercialPersona,
      email: membership.user.email,
      name: membership.user.name ?? "",
      membershipStatus: membership.status,
      roles: membership.roles.join(", "),
      userActive: membership.user.isActive,
      hasPassword: Boolean(membership.user.passwordHash),
      mustChangePassword: membership.user.mustChangePassword,
      lastActiveAt: membership.lastActiveAt?.toISOString() ?? "",
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

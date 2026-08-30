import { prisma } from "./src/lib/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      commercialPersona: "SUPPLIER",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      commercialPersona: true,
      memberships: {
        select: {
          status: true,
          roles: true,
          user: {
            select: {
              email: true,
              name: true,
              isActive: true,
              mustChangePassword: true,
              passwordHash: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  for (const tenant of tenants) {
    console.log("\nTENANT");
    console.table([
      {
        name: tenant.name,
        id: tenant.id,
        slug: tenant.slug,
        tenantStatus: tenant.status,
        persona: tenant.commercialPersona,
      },
    ]);

    console.log("USERS");
    console.table(
      tenant.memberships.map((membership) => ({
        email: membership.user.email,
        name: membership.user.name ?? "",
        membershipStatus: membership.status,
        roles: membership.roles.join(", "),
        userActive: membership.user.isActive,
        hasPassword: Boolean(membership.user.passwordHash),
        mustChangePassword: membership.user.mustChangePassword,
      })),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "./src/lib/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      commercialPersona: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.table(tenants);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

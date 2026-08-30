import { prisma } from "../src/lib/prisma";

const PLATFORM_TENANT_ID = "tenant_enorsis_platform";
const PLATFORM_TENANT_SLUG = "enorsis-platform";
const PLATFORM_TENANT_NAME = "Enorsis Platform";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      id: PLATFORM_TENANT_ID,
    },
    update: {
      slug: PLATFORM_TENANT_SLUG,
      name: PLATFORM_TENANT_NAME,
      legalName: "Enorsis",
      status: "ACTIVE",
      commercialPersona: "BUYER_SUPPLIER",
      countryCode: "US",
    },
    create: {
      id: PLATFORM_TENANT_ID,
      slug: PLATFORM_TENANT_SLUG,
      name: PLATFORM_TENANT_NAME,
      legalName: "Enorsis",
      status: "ACTIVE",
      commercialPersona: "BUYER_SUPPLIER",
      countryCode: "US",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      commercialPersona: true,
    },
  });

  console.table([tenant]);

  console.log("");
  console.log("Set these values in .env.local:");
  console.log(`ENORSIS_DEMO_TENANT_ID=${tenant.id}`);
  console.log(`ENORSIS_DEMO_TENANT_SLUG=${tenant.slug}`);
  console.log(`ENORSIS_DEMO_TENANT_NAME="${tenant.name}"`);
  console.log("");
  console.log(
    "Then restart the dev server and sign out/sign back in as info@enorsis.org.",
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

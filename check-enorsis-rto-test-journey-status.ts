import dotenv from "dotenv";

dotenv.config({
  path: ".env",
  quiet: true,
});

dotenv.config({
  path: ".env.local",
  override: true,
  quiet: true,
});

async function main() {
  const { prisma } =
    await import("./src/lib/prisma");

  const journeys =
    await prisma.requisitionOrderJourney.findMany({
      where: {
        journeyNumber: {
          in: [
            "RTO-2026-000001",
            "RTO-2026-000002",
          ],
        },
      },
      select: {
        journeyNumber: true,
        title: true,
        status: true,
        requiredByDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        journeyNumber: "asc",
      },
    });

  console.table(
    journeys.map((journey) => ({
      journeyNumber:
        journey.journeyNumber,
      title: journey.title,
      status: journey.status,
      requiredByDate:
        journey.requiredByDate?.toISOString() ??
        null,
      updatedAt:
        journey.updatedAt.toISOString(),
    })),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

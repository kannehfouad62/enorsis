import { prisma } from "./src/lib/prisma";

async function main() {
  const snapshots = await prisma.treasuryBalanceSnapshot.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  console.log("\n=== TREASURY BALANCE SNAPSHOTS ===");
  console.table(
    snapshots.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      treasuryAccountId: row.treasuryAccountId,
      availableBalance: row.availableBalance.toString(),
      ledgerBalance: row.ledgerBalance?.toString() ?? null,
      sourceReference: row.sourceReference,
      balanceDate: row.balanceDate.toISOString(),
      createdAt: row.createdAt.toISOString(),
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

import { prisma } from "@/lib/prisma";

export async function getBoardPackExportHistory(input: {
  tenantId: string;
  boardPackIds: string[];
}) {
  if (input.boardPackIds.length === 0) return [];

  return prisma.executiveBoardPackExport.findMany({
    where: {
      tenantId: input.tenantId,
      boardPackId: {
        in: input.boardPackIds,
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 200,
  });
}

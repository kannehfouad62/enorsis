import { prisma } from "@/lib/prisma";

export async function getFrozenBoardPackExportData(input: {
  tenantId: string;
  boardPackId: string;
}) {
  const pack = await prisma.executiveBoardPack.findFirstOrThrow({
    where: {
      id: input.boardPackId,
      tenantId: input.tenantId,
    },
    include: {
      definition: true,
    },
  });

  return {
    id: pack.id,
    packNumber: pack.packNumber,
    title: pack.title,
    packType: pack.packType,
    status: pack.status,
    periodType: pack.periodType,
    periodStart: pack.periodStart,
    periodEnd: pack.periodEnd,
    generatedAt: pack.generatedAt,
    finalizedAt: pack.finalizedAt,
    executiveSummary: pack.executiveSummary ?? "",
    sourceFingerprint: pack.sourceFingerprint,
    sourceSnapshot: pack.sourceSnapshot,
    sectionSnapshot: pack.sectionSnapshot,
    governanceSnapshot: pack.governanceSnapshot,
    definition: {
      name: pack.definition.name,
      description: pack.definition.description,
    },
  };
}

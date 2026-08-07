import { prisma } from "@/lib/prisma";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import type {
  BoardPackExportArtifact,
  BoardPackExportFormat,
} from "./export-types";
import { generateBoardPackPdf } from "./export-pdf";
import { generateBoardPackDocx } from "./export-docx";
import { generateBoardPackXlsx } from "./export-xlsx";
import { generateBoardPackPptx } from "./export-pptx";

async function generateArtifact(input: {
  tenantId: string;
  boardPackId: string;
  format: BoardPackExportFormat;
}) {
  if (input.format === "PDF") return generateBoardPackPdf(input);
  if (input.format === "DOCX") return generateBoardPackDocx(input);
  if (input.format === "XLSX") return generateBoardPackXlsx(input);
  return generateBoardPackPptx(input);
}

export async function exportExecutiveBoardPack(input: {
  tenantId: string;
  boardPackId: string;
  format: BoardPackExportFormat;
  actorUserId: string;
}): Promise<BoardPackExportArtifact> {
  const pack = await prisma.executiveBoardPack.findFirstOrThrow({
    where: {
      id: input.boardPackId,
      tenantId: input.tenantId,
    },
  });

  try {
    const artifact = await generateArtifact(input);

    await prisma.executiveBoardPackExport.create({
      data: {
        tenantId: input.tenantId,
        boardPackId: pack.id,
        format: input.format,
        status: "GENERATED",
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        byteSize: artifact.buffer.byteLength,
        generatedByUserId: input.actorUserId,
        sourceFingerprint: pack.sourceFingerprint,
      },
    });

    await publishDomainEvent({
      tenantId: input.tenantId,
      eventType: "ExecutiveBoardReporting.PackExported",
      aggregateType: "ExecutiveBoardPack",
      aggregateId: pack.id,
      sourceModule: "executive-board-reporting",
      actorUserId: input.actorUserId,
      payload: {
        boardPackId: pack.id,
        packNumber: pack.packNumber,
        format: input.format,
        fileName: artifact.fileName,
        byteSize: artifact.buffer.byteLength,
        sourceFingerprint: pack.sourceFingerprint,
      },
    });

    await recordEnterpriseActivity({
      tenantId: input.tenantId,
      activityType: "ExecutiveBoardReporting.PackExported",
      sourceModule: "executive-board-reporting",
      title: "Executive board pack exported",
      description: `${pack.packNumber} · ${input.format}`,
      severity: "SUCCESS",
      actorUserId: input.actorUserId,
      subjectType: "ExecutiveBoardPack",
      subjectId: pack.id,
      subjectLabel: artifact.fileName,
      actionUrl: "/app/executive/board-reporting",
    });

    return artifact;
  } catch (error) {
    await prisma.executiveBoardPackExport.create({
      data: {
        tenantId: input.tenantId,
        boardPackId: pack.id,
        format: input.format,
        status: "FAILED",
        fileName: `${pack.packNumber}.${input.format.toLowerCase()}`,
        contentType: "application/octet-stream",
        generatedByUserId: input.actorUserId,
        sourceFingerprint: pack.sourceFingerprint,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown board-pack export error.",
      },
    });

    throw error;
  }
}

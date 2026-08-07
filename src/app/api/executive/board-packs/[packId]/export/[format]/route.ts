import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportExecutiveBoardPack } from "@/core/executive-board-reporting/export-service";
import type { BoardPackExportFormat } from "@/core/executive-board-reporting/export-types";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "FINANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
]);

const formats = new Set<BoardPackExportFormat>([
  "PDF",
  "DOCX",
  "XLSX",
  "PPTX",
]);

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      packId: string;
      format: string;
    }>;
  },
) {
  const session = await auth();

  if (!session?.user?.tenantId || !session.user.roles?.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.roles.some((role) => allowedRoles.has(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { packId, format: rawFormat } = await context.params;
  const format = rawFormat.toUpperCase() as BoardPackExportFormat;

  if (!formats.has(format)) {
    return NextResponse.json(
      { error: "Unsupported export format" },
      { status: 400 },
    );
  }

  const artifact = await exportExecutiveBoardPack({
    tenantId: session.user.tenantId,
    boardPackId: packId,
    format,
    actorUserId: session.user.id,
  });

  return new NextResponse(new Uint8Array(artifact.buffer), {
    status: 200,
    headers: {
      "Content-Type": artifact.contentType,
      "Content-Disposition": `attachment; filename="${artifact.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Enorsis-Board-Pack-Export": format,
    },
  });
}

import { NextResponse } from "next/server";
import { validateBoardDeliveryAccess } from "@/core/executive-board-reporting/secure-access";
import { generateBoardPackPdf } from "@/core/executive-board-reporting/export-pdf";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ deliveryId: string }>;
  },
) {
  const { deliveryId } = await context.params;
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const delivery = await validateBoardDeliveryAccess({
      deliveryId,
      token,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      userAgent: request.headers.get("user-agent"),
      recordOpen: false,
    });

    const artifact = await generateBoardPackPdf({
      tenantId: delivery.tenantId,
      boardPackId: delivery.distribution.boardPackId,
    });

    return new NextResponse(new Uint8Array(artifact.buffer), {
      status: 200,
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

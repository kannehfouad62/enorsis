import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateSourcingAttachment } from "@/modules/sourcing/portal-documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.sourcingAttachment.findFirst({
    where: {
      id,
      event: { tenantId: session.user.tenantId },
    },
  });

  if (!attachment) {
    return new NextResponse("Attachment not found", { status: 404 });
  }

  const result = await getPrivateSourcingAttachment(
    attachment.blobPathname,
  );

  if (!result) {
    return new NextResponse("Stored attachment not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type":
        result.blob.contentType ?? "application/octet-stream",
      "Content-Disposition":
        `attachment; filename="${attachment.name.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateContractDocument } from "@/modules/contracts/documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.contractDocument.findFirst({
    where: {
      id,
      contract: { tenantId: session.user.tenantId },
    },
  });

  if (!document) {
    return new NextResponse("Contract document not found", { status: 404 });
  }

  const result = await getPrivateContractDocument(document.blobPathname);

  if (!result) {
    return new NextResponse("Stored contract document not found", {
      status: 404,
    });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type":
        result.blob.contentType ?? "application/octet-stream",
      "Content-Disposition":
        `attachment; filename="${document.name.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

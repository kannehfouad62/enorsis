import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateSupplierDocument } from "@/modules/suppliers/documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!session.user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;

  const document = await prisma.supplierDocument.findFirst({
    where: {
      id,
      supplier: {
        isTenantSelfProfile: true,
      },
    },
  });

  if (!document?.blobPathname) {
    return new NextResponse("Document not found", { status: 404 });
  }

  const result = await getPrivateSupplierDocument(
    document.blobPathname,
  );

  if (!result) {
    return new NextResponse(
      "Stored document could not be found",
      { status: 404 },
    );
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type":
        result.blob.contentType ??
        "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.name.replaceAll('"', "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

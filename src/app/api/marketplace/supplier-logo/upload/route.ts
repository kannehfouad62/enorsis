import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
  "PLATFORM_SUPER_ADMIN",
]);

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
      ) => {
        const session = await auth();

        if (!session?.user?.tenantId) {
          throw new Error(
            "Authentication is required for supplier logo uploads.",
          );
        }

        if (
          !session.user.roles.some((role) =>
            allowedRoles.has(role),
          )
        ) {
          throw new Error(
            "Your role cannot update the supplier marketplace logo.",
          );
        }

        let payload: { supplierId?: string };

        try {
          payload = JSON.parse(
            clientPayload ?? "{}",
          ) as { supplierId?: string };
        } catch {
          throw new Error(
            "Invalid supplier logo upload payload.",
          );
        }

        if (!payload.supplierId) {
          throw new Error("Supplier is required.");
        }

        const supplier =
          await prisma.supplier.findFirst({
            where: {
              id: payload.supplierId,
              tenantId: session.user.tenantId,
              isTenantSelfProfile: true,
            },
            select: { id: true },
          });

        if (!supplier) {
          throw new Error(
            "Supplier marketplace profile was not found for this tenant.",
          );
        }

        const expectedPrefix =
          `marketplace/suppliers/${supplier.id}/`;

        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error(
            "Supplier logo upload path is outside the authorized seller profile.",
          );
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            supplierId: supplier.id,
            tenantId: session.user.tenantId,
            userId: session.user.id,
          }),
        };
      },

      onUploadCompleted: async () => {
        // The authenticated registration endpoint persists the logo metadata.
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supplier logo upload authorization failed.",
      },
      { status: 400 },
    );
  }
}

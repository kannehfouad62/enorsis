import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGES = 8;

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
            "Authentication is required for marketplace uploads.",
          );
        }

        if (
          !session.user.roles.some((role) =>
            allowedRoles.has(role),
          )
        ) {
          throw new Error(
            "Your role cannot upload marketplace images.",
          );
        }

        let payload: { offeringId?: string };

        try {
          payload = JSON.parse(
            clientPayload ?? "{}",
          ) as { offeringId?: string };
        } catch {
          throw new Error(
            "Invalid marketplace upload payload.",
          );
        }

        if (!payload.offeringId) {
          throw new Error(
            "Marketplace offering is required.",
          );
        }

        const offering =
          await prisma.supplierMarketplaceOffering.findFirst({
            where: {
              id: payload.offeringId,
              tenantId: session.user.tenantId,
            },
            select: {
              id: true,
              supplierId: true,
            },
          });

        if (!offering) {
          throw new Error(
            "Marketplace offering was not found.",
          );
        }

        const selfSupplier =
          await prisma.supplier.findFirst({
            where: {
              id: offering.supplierId,
              tenantId: session.user.tenantId,
              isTenantSelfProfile: true,
            },
            select: { id: true },
          });

        if (!selfSupplier) {
          throw new Error(
            "Marketplace offering is not owned by this supplier tenant.",
          );
        }

        const expectedPrefix =
          `marketplace/${offering.id}/`;

        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error(
            "Marketplace upload path is outside the authorized offering.",
          );
        }

        const currentCount =
          await prisma.supplierMarketplaceOfferingMedia.count({
            where: {
              tenantId: session.user.tenantId,
              offeringId: offering.id,
            },
          });

        if (currentCount >= MAX_IMAGES) {
          throw new Error(
            "This offering already contains the maximum of 8 images.",
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
            offeringId: offering.id,
            tenantId: session.user.tenantId,
            userId: session.user.id,
          }),
        };
      },

      onUploadCompleted: async () => {
        // Registration is performed immediately by the authenticated
        // /media/register endpoint after the browser upload completes.
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Marketplace upload authorization failed.",
      },
      { status: 400 },
    );
  }
}

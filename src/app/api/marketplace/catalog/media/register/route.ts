import { head } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGES = 8;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      offeringId?: string;
      pathname?: string;
      altText?: string;
    };

    const offeringId = body.offeringId?.trim();
    const pathname = body.pathname?.trim();

    if (!offeringId || !pathname) {
      return NextResponse.json(
        {
          error:
            "Offering ID and uploaded image pathname are required.",
        },
        { status: 400 },
      );
    }

    const offering =
      await prisma.supplierMarketplaceOffering.findFirst({
        where: {
          id: offeringId,
          tenantId: session.user.tenantId,
        },
        select: {
          id: true,
          name: true,
          supplierId: true,
        },
      });

    if (!offering) {
      return NextResponse.json(
        { error: "Marketplace offering was not found." },
        { status: 404 },
      );
    }

    const selfSupplier = await prisma.supplier.findFirst({
      where: {
        id: offering.supplierId,
        tenantId: session.user.tenantId,
        isTenantSelfProfile: true,
      },
      select: { id: true },
    });

    if (!selfSupplier) {
      return NextResponse.json(
        {
          error:
            "Marketplace offering is not owned by this supplier tenant.",
        },
        { status: 403 },
      );
    }

    if (
      !pathname.startsWith(
        `marketplace/${offering.id}/`,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Uploaded image does not belong to this marketplace offering.",
        },
        { status: 403 },
      );
    }

    const duplicate =
      await prisma.supplierMarketplaceOfferingMedia.findFirst({
        where: {
          tenantId: session.user.tenantId,
          offeringId: offering.id,
          pathname,
        },
        select: { id: true },
      });

    if (duplicate) {
      return NextResponse.json({
        id: duplicate.id,
        alreadyRegistered: true,
      });
    }

    const blob = await head(pathname);

    if (!ALLOWED_TYPES.has(blob.contentType)) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG and WebP marketplace images are supported.",
        },
        { status: 400 },
      );
    }

    if (blob.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Marketplace images must be 8 MB or smaller.",
        },
        { status: 400 },
      );
    }

    const existingCount =
      await prisma.supplierMarketplaceOfferingMedia.count({
        where: {
          tenantId: session.user.tenantId,
          offeringId: offering.id,
        },
      });

    if (existingCount >= MAX_IMAGES) {
      return NextResponse.json(
        {
          error:
            "This offering already contains the maximum of 8 images.",
        },
        { status: 400 },
      );
    }

    const isPrimary = existingCount === 0;

    const media = await prisma.$transaction(
      async (tx) => {
        const created =
          await tx.supplierMarketplaceOfferingMedia.create({
            data: {
              tenantId: session.user.tenantId,
              offeringId: offering.id,
              pathname: blob.pathname,
              contentType: blob.contentType,
              sizeBytes: blob.size,
              altText:
                body.altText?.trim() ||
                offering.name,
              position: existingCount,
              isPrimary,
              uploadedByUserId: session.user.id,
            },
          });

        if (isPrimary) {
          await tx.supplierMarketplaceOffering.update({
            where: { id: offering.id },
            data: {
              imageRef: blob.pathname,
            },
          });
        }

        await tx.auditEvent.create({
          data: {
            tenantId: session.user.tenantId,
            userId: session.user.id,
            actorType: "USER",
            actorId: session.user.id,
            actorLabel:
              session.user.email ??
              "Marketplace supplier",
            action:
              "supplier_marketplace.media.upload",
            resourceType:
              "SupplierMarketplaceOfferingMedia",
            resourceId: created.id,
            after: {
              offeringId: offering.id,
              pathname: blob.pathname,
              contentType: blob.contentType,
              sizeBytes: blob.size,
              isPrimary,
            },
          },
        });

        return created;
      },
    );

    return NextResponse.json({
      id: media.id,
      isPrimary: media.isPrimary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Marketplace image registration failed.",
      },
      { status: 400 },
    );
  }
}

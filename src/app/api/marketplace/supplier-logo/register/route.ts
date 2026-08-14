import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
  "PLATFORM_SUPER_ADMIN",
]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (
    !session.user.roles.some((role) =>
      allowedRoles.has(role),
    )
  ) {
    return NextResponse.json(
      { error: "Your role cannot update the supplier marketplace logo." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    supplierId?: string;
    pathname?: string;
    contentType?: string;
  };

  if (
    !body.supplierId ||
    !body.pathname ||
    !body.contentType
  ) {
    return NextResponse.json(
      { error: "Supplier, pathname and content type are required." },
      { status: 400 },
    );
  }

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: body.supplierId,
      tenantId: session.user.tenantId,
      isTenantSelfProfile: true,
    },
  });

  if (!supplier) {
    return NextResponse.json(
      { error: "Supplier marketplace profile was not found." },
      { status: 404 },
    );
  }

  const expectedPrefix =
    `marketplace/suppliers/${supplier.id}/`;

  if (!body.pathname.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Supplier logo pathname is outside the authorized profile." },
      { status: 400 },
    );
  }

  if (
    !["image/jpeg", "image/png", "image/webp"].includes(
      body.contentType,
    )
  ) {
    return NextResponse.json(
      { error: "Unsupported supplier logo content type." },
      { status: 400 },
    );
  }

  const oldPathname =
    supplier.marketplaceLogoPathname;

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplier.id },
      data: {
        marketplaceLogoPathname: body.pathname,
        marketplaceLogoContentType: body.contentType,
        marketplaceLogoUpdatedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        actorType: "USER",
        actorId: session.user.id,
        actorLabel: session.user.email,
        action: oldPathname
          ? "marketplace.supplier.logo.replace"
          : "marketplace.supplier.logo.upload",
        resourceType: "Supplier",
        resourceId: supplier.id,
        before: {
          marketplaceLogoConfigured:
            Boolean(oldPathname),
        },
        after: {
          marketplaceLogoConfigured: true,
          contentType: body.contentType,
        },
      },
    });
  });

  if (
    oldPathname &&
    oldPathname !== body.pathname
  ) {
    try {
      await del(oldPathname);
    } catch {
      // The new logo is already registered. Blob cleanup failure should not
      // roll back the seller profile update.
    }
  }

  return NextResponse.json({ ok: true });
}

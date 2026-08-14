import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMarketplaceImage } from "@/modules/marketplace-catalog/media";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ supplierId: string }>;
  },
) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const { supplierId } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      tenantId: true,
      marketplaceLogoPathname: true,
      marketplaceLogoContentType: true,
    },
  });

  if (
    !supplier ||
    !supplier.marketplaceLogoPathname ||
    !supplier.marketplaceLogoContentType
  ) {
    return new Response("Not found", {
      status: 404,
    });
  }

  const platform = session.user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );

  const isOwnerTenant =
    supplier.tenantId === session.user.tenantId;

  const visibleOfferingCount =
    await prisma.supplierMarketplaceOffering.count({
      where: {
        supplierId,
        marketplaceVisible: true,
      },
    });

  const isMarketplaceVisible =
    visibleOfferingCount > 0;

  if (
    !isOwnerTenant &&
    !platform &&
    !isMarketplaceVisible
  ) {
    return new Response("Forbidden", {
      status: 403,
    });
  }

  const blob = await getMarketplaceImage(
    supplier.marketplaceLogoPathname,
  );

  if (!blob?.stream) {
    return new Response("Not found", {
      status: 404,
    });
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type":
        supplier.marketplaceLogoContentType,
      "Cache-Control": isMarketplaceVisible
        ? "private, max-age=3600"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
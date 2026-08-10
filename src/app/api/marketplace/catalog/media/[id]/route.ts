import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMarketplaceImage } from "@/modules/marketplace-catalog/media";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const media = await prisma.supplierMarketplaceOfferingMedia.findUnique({ where: { id } });
  if (!media) return new Response("Not found", { status: 404 });
  const offering = await prisma.supplierMarketplaceOffering.findUnique({
    where: { id: media.offeringId },
    select: { tenantId: true, marketplaceVisible: true },
  });
  if (!offering) return new Response("Not found", { status: 404 });
  const platform = session.user.roles.some((role) => role.startsWith("PLATFORM_"));
  if (!offering.marketplaceVisible && offering.tenantId !== session.user.tenantId && !platform) {
    return new Response("Forbidden", { status: 403 });
  }
  const blob = await getMarketplaceImage(media.pathname);
  if (!blob?.stream) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": offering.marketplaceVisible ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

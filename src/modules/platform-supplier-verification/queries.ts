import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

export async function getPlatformSupplierVerificationQueue() {
  await requireAnyRole(["PLATFORM_SUPER_ADMIN"]);

  const documents = await prisma.supplierDocument.findMany({
    where: {
      supplier: {
        isTenantSelfProfile: true,
      },
    },
    include: {
      supplier: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              commercialPersona: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
    take: 500,
  });

  const pending = documents.filter(
    (document) => document.status === "PENDING_VERIFICATION",
  );
  const verified = documents.filter(
    (document) => document.status === "VERIFIED",
  );
  const rejected = documents.filter(
    (document) => document.status === "REJECTED",
  );
  const expired = documents.filter(
    (document) =>
      document.status === "EXPIRED" ||
      (document.expiresAt ? document.expiresAt <= new Date() : false),
  );

  return {
    documents,
    pending,
    verified,
    rejected,
    expired,
    metrics: {
      total: documents.length,
      pending: pending.length,
      verified: verified.length,
      rejected: rejected.length,
      expired: expired.length,
    },
  };
}

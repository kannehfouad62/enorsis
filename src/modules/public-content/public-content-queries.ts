import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPublicPublisherContext() {
  const session = await auth();

  return {
    session,
    canPublish:
      session?.user.roles.includes(
        "PLATFORM_SUPER_ADMIN",
      ) ?? false,
  };
}

export async function getPublicationsPageData() {
  const { session, canPublish } =
    await getPublicPublisherContext();

  const publications =
    await prisma.publicSitePublication.findMany({
      where: canPublish
        ? undefined
        : {
            status: "PUBLISHED",
          },
      orderBy: [
        { featured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

  return {
    session,
    canPublish,
    publications,
  };
}

export async function getGuidesPageData() {
  const { session, canPublish } =
    await getPublicPublisherContext();

  const guides =
    await prisma.publicSiteGuide.findMany({
      where: canPublish
        ? undefined
        : {
            status: "PUBLISHED",
          },
      orderBy: [
        { featured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

  return {
    session,
    canPublish,
    guides,
  };
}

export async function getCareersPageData() {
  const { session, canPublish } =
    await getPublicPublisherContext();

  const jobs =
    await prisma.publicSiteJobOpening.findMany({
      where: canPublish
        ? undefined
        : {
            status: "PUBLISHED",
            OR: [
              { closesAt: null },
              {
                closesAt: {
                  gte: new Date(),
                },
              },
            ],
          },
      orderBy: [
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

  return {
    session,
    canPublish,
    jobs,
  };
}

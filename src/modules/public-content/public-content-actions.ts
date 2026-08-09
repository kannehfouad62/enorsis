"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const publisherRoles = [
  "PLATFORM_SUPER_ADMIN",
] as const;

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function status(data: FormData) {
  return data.get("publish") === "true"
    ? "PUBLISHED"
    : "DRAFT";
}

export async function createPublicationAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const title = text(data, "title");
  const summary = text(data, "summary");
  const body = text(data, "body");
  const category =
    text(data, "category") ||
    "Procurement";

  if (!title || !summary || !body) {
    throw new Error(
      "Title, summary and publication body are required.",
    );
  }

  const nextStatus = status(data);

  await prisma.publicSitePublication.create({
    data: {
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      category,
      title,
      summary,
      body,
      readTime:
        text(data, "readTime") ||
        null,
      status: nextStatus,
      featured:
        data.get("featured") === "on",
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      createdByUserId: user.id,
    },
  });

  revalidatePath(
    "/resources/publications",
  );
}

export async function createGuideAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const title = text(data, "title");
  const summary = text(data, "summary");
  const resourceType =
    text(data, "resourceType") ||
    "Guide";

  const file = data.get("file");

  if (
    !title ||
    !summary ||
    !(file instanceof File) ||
    file.size === 0
  ) {
    throw new Error(
      "Title, summary and eBook/guide file are required.",
    );
  }

  const allowed = [
    "application/pdf",
    "application/epub+zip",
  ];

  if (
    file.type &&
    !allowed.includes(file.type)
  ) {
    throw new Error(
      "Guide uploads must be PDF or EPUB.",
    );
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error(
      "Guide uploads are limited to 25 MB.",
    );
  }

  const blob = await put(
    `public-resources/${Date.now()}-${file.name}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
    },
  );

  const nextStatus = status(data);

  const pageCountRaw =
    Number(text(data, "pageCount"));

  await prisma.publicSiteGuide.create({
    data: {
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      summary,
      resourceType,
      pageCount:
        Number.isFinite(pageCountRaw) &&
        pageCountRaw > 0
          ? Math.floor(pageCountRaw)
          : null,
      fileUrl: blob.url,
      fileName: file.name,
      status: nextStatus,
      featured:
        data.get("featured") === "on",
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/resources/guides");
}

export async function createJobOpeningAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const title = text(data, "title");
  const department =
    text(data, "department");
  const location =
    text(data, "location");
  const employmentType =
    text(data, "employmentType");
  const summary = text(data, "summary");
  const description =
    text(data, "description");

  if (
    !title ||
    !department ||
    !location ||
    !employmentType ||
    !summary ||
    !description
  ) {
    throw new Error(
      "Role title, department, location, employment type, summary and description are required.",
    );
  }

  const applyUrl =
    text(data, "applyUrl") || null;
  const applyEmail =
    text(data, "applyEmail") ||
    "careers@enorsis.org";

  const nextStatus = status(data);
  const closesAtText =
    text(data, "closesAt");

  await prisma.publicSiteJobOpening.create({
    data: {
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      department,
      location,
      employmentType,
      workArrangement:
        text(data, "workArrangement") ||
        null,
      summary,
      description,
      applyUrl,
      applyEmail,
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      closesAt:
        closesAtText
          ? new Date(`${closesAtText}T23:59:59`)
          : null,
      createdByUserId: user.id,
    },
  });

  revalidatePath("/careers");
}

export async function setPublicationStatusAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const id = text(data, "id");
  const nextStatus =
    text(data, "status") === "PUBLISHED"
      ? "PUBLISHED"
      : "DRAFT";

  await prisma.publicSitePublication.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      updatedByUserId: user.id,
    },
  });

  revalidatePath(
    "/resources/publications",
  );
}

export async function setGuideStatusAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const id = text(data, "id");
  const nextStatus =
    text(data, "status") === "PUBLISHED"
      ? "PUBLISHED"
      : "DRAFT";

  await prisma.publicSiteGuide.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/resources/guides");
}

export async function setJobStatusAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...publisherRoles]);

  const id = text(data, "id");
  const nextStatus =
    text(data, "status") === "PUBLISHED"
      ? "PUBLISHED"
      : "DRAFT";

  await prisma.publicSiteJobOpening.update({
    where: { id },
    data: {
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? new Date()
          : null,
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/careers");
}

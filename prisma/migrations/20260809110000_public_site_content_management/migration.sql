CREATE TABLE "PublicSitePublication" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicSitePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicSiteGuide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "pageCount" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicSiteGuide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicSiteJobOpening" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "workArrangement" TEXT,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applyUrl" TEXT,
    "applyEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicSiteJobOpening_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicSitePublication_slug_key"
ON "PublicSitePublication"("slug");

CREATE UNIQUE INDEX "PublicSiteGuide_slug_key"
ON "PublicSiteGuide"("slug");

CREATE UNIQUE INDEX "PublicSiteJobOpening_slug_key"
ON "PublicSiteJobOpening"("slug");

CREATE INDEX "PublicPublication_status_idx"
ON "PublicSitePublication"("status", "publishedAt");

CREATE INDEX "PublicPublication_featured_idx"
ON "PublicSitePublication"("featured", "status");

CREATE INDEX "PublicGuide_status_idx"
ON "PublicSiteGuide"("status", "publishedAt");

CREATE INDEX "PublicGuide_featured_idx"
ON "PublicSiteGuide"("featured", "status");

CREATE INDEX "PublicJob_status_idx"
ON "PublicSiteJobOpening"("status", "publishedAt");

CREATE INDEX "PublicJob_department_idx"
ON "PublicSiteJobOpening"("department", "status");

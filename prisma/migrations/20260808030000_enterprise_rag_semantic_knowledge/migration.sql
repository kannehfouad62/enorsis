CREATE TABLE "EnterpriseKnowledgeSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "externalReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contentHash" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseKnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnterpriseKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "embedding" JSONB,
    "embeddingModel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseKnowledgeSource_tenantId_status_idx"
ON "EnterpriseKnowledgeSource"("tenantId", "status");

CREATE INDEX "EnterpriseKnowledgeSource_tenantId_sourceType_idx"
ON "EnterpriseKnowledgeSource"("tenantId", "sourceType");

CREATE INDEX "EnterpriseKnowledgeChunk_tenantId_idx"
ON "EnterpriseKnowledgeChunk"("tenantId");

CREATE INDEX "EnterpriseKnowledgeChunk_tenantId_sourceId_idx"
ON "EnterpriseKnowledgeChunk"("tenantId", "sourceId");

CREATE UNIQUE INDEX "EnterpriseKnowledgeChunk_sourceId_ordinal_key"
ON "EnterpriseKnowledgeChunk"("sourceId", "ordinal");

ALTER TABLE "EnterpriseKnowledgeChunk"
ADD CONSTRAINT "EnterpriseKnowledgeChunk_sourceId_fkey"
FOREIGN KEY ("sourceId")
REFERENCES "EnterpriseKnowledgeSource"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

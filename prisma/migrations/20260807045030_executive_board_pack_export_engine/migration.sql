-- CreateEnum
CREATE TYPE "ExecutiveBoardPackExportFormat" AS ENUM ('PDF', 'DOCX', 'XLSX', 'PPTX');

-- CreateEnum
CREATE TYPE "ExecutiveBoardPackExportStatus" AS ENUM ('GENERATED', 'FAILED');

-- CreateTable
CREATE TABLE "ExecutiveBoardPackExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardPackId" TEXT NOT NULL,
    "format" "ExecutiveBoardPackExportFormat" NOT NULL,
    "status" "ExecutiveBoardPackExportStatus" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFingerprint" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "ExecutiveBoardPackExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutiveBoardPackExport_tenantId_generatedAt_idx" ON "ExecutiveBoardPackExport"("tenantId", "generatedAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardPackExport_boardPackId_generatedAt_idx" ON "ExecutiveBoardPackExport"("boardPackId", "generatedAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardPackExport_format_status_idx" ON "ExecutiveBoardPackExport"("format", "status");

-- AddForeignKey
ALTER TABLE "ExecutiveBoardPackExport" ADD CONSTRAINT "ExecutiveBoardPackExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardPackExport" ADD CONSTRAINT "ExecutiveBoardPackExport_boardPackId_fkey" FOREIGN KEY ("boardPackId") REFERENCES "ExecutiveBoardPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

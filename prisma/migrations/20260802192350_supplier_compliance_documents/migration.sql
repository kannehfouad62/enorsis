-- CreateEnum
CREATE TYPE "SupplierDocumentStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "SupplierDocument" ADD COLUMN     "blobPathname" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_status_idx" ON "SupplierDocument"("supplierId", "status");

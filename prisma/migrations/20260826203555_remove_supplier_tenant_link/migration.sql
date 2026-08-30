/*
  Warnings:

  - You are about to drop the column `linkedSupplierTenantId` on the `Supplier` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Supplier_linkedSupplierTenantId_idx";

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "linkedSupplierTenantId";

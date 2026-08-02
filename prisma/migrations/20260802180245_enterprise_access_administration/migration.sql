-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "approvalLimitUsd" DECIMAL(18,2),
ADD COLUMN     "departmentScopeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "legalEntityScopeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "siteScopeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

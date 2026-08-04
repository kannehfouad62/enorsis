from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum AccessReviewStatus" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum AccessReviewStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum AccessReviewItemStatus {
  PENDING
  CERTIFIED
  REVOKE_REQUESTED
  ROLE_CHANGE_REQUESTED
  EXCEPTION_APPROVED
  REMEDIATED
}

enum AccessReviewDecision {
  CERTIFY
  REVOKE
  CHANGE_ROLE
  APPROVE_EXCEPTION
}

enum SodRuleStatus {
  ACTIVE
  INACTIVE
}

enum SodViolationStatus {
  OPEN
  EXCEPTION_APPROVED
  REMEDIATION_REQUIRED
  REMEDIATED
  DISMISSED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate Tenant model.")

tenant_block = tenant_match.group(1)
for relation in [
    "accessReviewCampaigns AccessReviewCampaign[]",
    "sodRules              SodRule[]",
    "sodViolations         SodViolation[]",
]:
    name = relation.split()[0]
    if name not in tenant_block:
        tenant_block += f"\n  {relation}"

schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model AccessReviewCampaign {" not in schema:
    schema += r"""

model AccessReviewCampaign {
  id                    String             @id @default(cuid())
  tenantId              String
  name                  String
  description           String?
  status                AccessReviewStatus @default(DRAFT)
  reviewerUserId        String
  scopeRoles            String[]
  scopeUserIds          String[]
  dueAt                 DateTime
  launchedAt            DateTime?
  completedAt           DateTime?
  createdByUserId       String
  tenant                Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  items                 AccessReviewItem[]
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([tenantId, status, dueAt])
  @@index([reviewerUserId, status])
}

model AccessReviewItem {
  id                    String                 @id @default(cuid())
  campaignId            String
  membershipId          String
  userId                String
  userEmail             String
  userName              String?
  currentRoles          String[]
  requestedRoles        String[]
  status                AccessReviewItemStatus @default(PENDING)
  decision              AccessReviewDecision?
  decisionComments      String?
  decidedByUserId       String?
  decidedAt             DateTime?
  remediatedByUserId    String?
  remediatedAt          DateTime?
  campaign              AccessReviewCampaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@unique([campaignId, membershipId])
  @@index([campaignId, status])
  @@index([userId, status])
}

model SodRule {
  id                    String        @id @default(cuid())
  tenantId              String
  key                   String
  name                  String
  description           String
  status                SodRuleStatus @default(ACTIVE)
  conflictingRoleA      String
  conflictingRoleB      String
  severity              Int           @default(3)
  remediationGuidance   String?
  createdByUserId       String
  tenant                Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  violations            SodViolation[]
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([tenantId, key])
  @@index([tenantId, status, severity])
}

model SodViolation {
  id                    String             @id @default(cuid())
  tenantId              String
  sodRuleId             String
  membershipId          String
  userId                String
  userEmail             String
  userName              String?
  detectedRoles         String[]
  status                SodViolationStatus @default(OPEN)
  exceptionReason       String?
  exceptionExpiresAt    DateTime?
  remediationNotes      String?
  reviewedByUserId      String?
  reviewedAt            DateTime?
  remediatedByUserId    String?
  remediatedAt          DateTime?
  tenant                Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sodRule               SodRule            @relation(fields: [sodRuleId], references: [id], onDelete: Cascade)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@unique([sodRuleId, membershipId])
  @@index([tenantId, status, createdAt])
  @@index([userId, status])
}
"""

path.write_text(schema)
print("Access governance schema applied.")

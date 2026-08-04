from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enums = """enum ProcurementPolicyStatus {
  DRAFT
  ACTIVE
  RETIRED
}

enum ProcurementPolicyRuleType {
  APPROVAL_LIMIT
  COMPETITIVE_BIDDING
  CONTRACT_REQUIRED
  PREFERRED_SUPPLIER
  DOCUMENT_REQUIRED
  SEGREGATION_OF_DUTIES
  SPEND_THRESHOLD
  COUNTRY_RESTRICTION
  CATEGORY_RESTRICTION
  CUSTOM
}

enum ProcurementComplianceTestStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ProcurementRemediationStatus {
  OPEN
  IN_PROGRESS
  BLOCKED
  COMPLETED
  CANCELLED
}

"""

if "enum ProcurementPolicyStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_start = schema.find("model Tenant {")
if tenant_start == -1:
    raise SystemExit("Could not locate Tenant model.")
tenant_end = schema.find("\n}", tenant_start)
if tenant_end == -1:
    raise SystemExit("Could not locate the end of Tenant model.")
tenant_block = schema[tenant_start:tenant_end]
relations = [
    "  procurementPolicies          ProcurementPolicy[]",
    "  procurementComplianceTests   ProcurementComplianceTest[]",
    "  procurementRemediations      ProcurementRemediation[]",
]
missing = [line for line in relations if line.split()[0].strip() not in tenant_block]
if missing:
    anchor = tenant_block.find("\n  createdAt")
    if anchor == -1:
        raise SystemExit("Could not locate Tenant.createdAt insertion anchor.")
    tenant_block = tenant_block[:anchor] + "\n" + "\n".join(missing) + tenant_block[anchor:]
    schema = schema[:tenant_start] + tenant_block + schema[tenant_end:]

if "model ProcurementPolicy {" not in schema:
    schema += """

model ProcurementPolicy {
  id               String                  @id @default(cuid())
  tenantId         String
  code             String
  title            String
  description      String
  status           ProcurementPolicyStatus @default(DRAFT)
  version          Int                     @default(1)
  effectiveAt      DateTime?
  expiresAt        DateTime?
  ownerUserId      String
  approvedByUserId String?
  approvedAt       DateTime?
  tenant           Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rules            ProcurementPolicyRule[]
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt

  @@unique([tenantId, code, version])
  @@index([tenantId, status, effectiveAt])
}

model ProcurementPolicyRule {
  id                  String                    @id @default(cuid())
  procurementPolicyId String
  key                 String
  name                String
  description         String?
  type                ProcurementPolicyRuleType
  isBlocking          Boolean                   @default(false)
  severity            Int                       @default(3)
  resourceType        String?
  requiredEvidence    String[]
  remediationGuidance String?
  policy              ProcurementPolicy         @relation(fields: [procurementPolicyId], references: [id], onDelete: Cascade)
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  @@unique([procurementPolicyId, key])
  @@index([procurementPolicyId, type, severity])
}

model ProcurementComplianceTest {
  id                String                           @id @default(cuid())
  tenantId          String
  name              String
  description       String?
  status            ProcurementComplianceTestStatus @default(DRAFT)
  periodStart       DateTime
  periodEnd         DateTime
  ownerUserId       String
  sampleSize        Int                              @default(0)
  compliantCount    Int                              @default(0)
  nonCompliantCount Int                              @default(0)
  exceptionCount    Int                              @default(0)
  methodology       String
  conclusion        String?
  completedAt       DateTime?
  tenant            Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  remediations      ProcurementRemediation[]
  createdAt         DateTime                         @default(now())
  updatedAt         DateTime                         @updatedAt

  @@index([tenantId, status, periodEnd])
}

model ProcurementRemediation {
  id                 String                       @id @default(cuid())
  tenantId           String
  complianceTestId   String?
  title              String
  description        String
  status             ProcurementRemediationStatus @default(OPEN)
  severity           Int                          @default(3)
  ownerUserId        String
  dueAt              DateTime
  blocker            String?
  completionEvidence String?
  completedAt        DateTime?
  sourceType         String?
  sourceId           String?
  tenant             Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  complianceTest     ProcurementComplianceTest?   @relation(fields: [complianceTestId], references: [id], onDelete: SetNull)
  createdAt          DateTime                     @default(now())
  updatedAt          DateTime                     @updatedAt

  @@index([tenantId, status, dueAt])
  @@index([complianceTestId, status])
}
"""

path.write_text(schema)
print("Procurement policy and compliance schema applied.")

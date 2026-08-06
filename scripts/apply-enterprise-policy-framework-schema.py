from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterprisePolicyStatus {
  DRAFT
  ACTIVE
  RETIRED
}

enum EnterprisePolicyValueType {
  BOOLEAN
  STRING
  NUMBER
  JSON
}

enum EnterpriseFeatureFlagStatus {
  DRAFT
  ACTIVE
  PAUSED
  RETIRED
}

'''

MODELS = '''model EnterprisePolicyDefinition {
  id                String                    @id @default(cuid())
  key               String                    @unique
  name              String
  description       String?
  category          String
  moduleKey         String?
  valueType         EnterprisePolicyValueType
  defaultValue      Json
  validationSchema  Json?
  status            EnterprisePolicyStatus    @default(DRAFT)
  version           Int                       @default(1)
  managedByPlatform Boolean                   @default(false)
  tenantOverrides   EnterpriseTenantPolicy[]
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt

  @@index([category, status])
  @@index([moduleKey, status])
}

model EnterpriseTenantPolicy {
  id                 String                     @id @default(cuid())
  tenantId           String
  policyDefinitionId String
  value              Json
  active             Boolean                    @default(true)
  effectiveFrom      DateTime                   @default(now())
  effectiveUntil     DateTime?
  reason             String?
  approvedByUserId   String?
  approvedAt         DateTime?
  createdByUserId    String?
  updatedByUserId    String?
  tenant             Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  policyDefinition   EnterprisePolicyDefinition @relation(fields: [policyDefinitionId], references: [id], onDelete: Cascade)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  @@unique([tenantId, policyDefinitionId])
  @@index([tenantId, active])
  @@index([effectiveFrom, effectiveUntil])
}

model EnterpriseFeatureFlag {
  id                 String                      @id @default(cuid())
  key                String                      @unique
  name               String
  description        String?
  moduleKey          String?
  status             EnterpriseFeatureFlagStatus @default(DRAFT)
  defaultEnabled     Boolean                     @default(false)
  rolloutPercentage  Int                         @default(0)
  managedPaaSOnly    Boolean                     @default(false)
  requiresFeatureKey String?
  rules              Json?
  tenantOverrides    EnterpriseTenantFeatureFlag[]
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt

  @@index([moduleKey, status])
  @@index([managedPaaSOnly, status])
}

model EnterpriseTenantFeatureFlag {
  id             String                @id @default(cuid())
  tenantId       String
  featureFlagId  String
  enabled        Boolean
  reason         String?
  startsAt       DateTime              @default(now())
  expiresAt      DateTime?
  createdByUserId String?
  tenant         Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  featureFlag    EnterpriseFeatureFlag @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt

  @@unique([tenantId, featureFlagId])
  @@index([tenantId, enabled])
  @@index([startsAt, expiresAt])
}
'''

def bounds(text: str, model: str):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum EnterprisePolicyStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
relations = [
    "  enterprisePolicies EnterpriseTenantPolicy[]",
    "  enterpriseFeatureFlags EnterpriseTenantFeatureFlag[]",
]
for relation in relations:
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model EnterprisePolicyDefinition {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Enterprise policy framework schema applied.")

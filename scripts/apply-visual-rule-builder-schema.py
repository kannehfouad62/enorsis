from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum EnterpriseAutomationRuleVersionStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  PUBLISHED
  SUPERSEDED
  ARCHIVED
}

enum EnterpriseAutomationSimulationStatus {
  PASSED
  FAILED
  WARNING
}

"""

MODELS = """
model EnterpriseAutomationRuleVersion {
  id                    String                                @id @default(cuid())
  tenantId              String
  ruleId                String
  versionNumber         Int
  status                EnterpriseAutomationRuleVersionStatus @default(DRAFT)
  designerState         Json
  validationReport      Json?
  changeSummary         String?
  createdByUserId       String
  reviewedByUserId      String?
  reviewedAt            DateTime?
  publishedAt           DateTime?
  tenant                Tenant                                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule              @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  simulations           EnterpriseAutomationSimulation[]
  createdAt             DateTime                              @default(now())

  @@unique([ruleId, versionNumber])
  @@index([tenantId, status, createdAt])
}

model EnterpriseAutomationTemplate {
  id                    String   @id @default(cuid())
  tenantId              String?
  templateKey           String
  name                  String
  description           String?
  category              String
  designerState         Json
  systemTemplate        Boolean  @default(false)
  active                Boolean  @default(true)
  createdByUserId       String?
  tenant                Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, templateKey])
  @@index([tenantId, category, active])
  @@index([systemTemplate, active])
}

model EnterpriseAutomationSimulation {
  id                    String                               @id @default(cuid())
  tenantId              String
  ruleId                String
  versionId             String?
  status                EnterpriseAutomationSimulationStatus
  input                 Json
  matched               Boolean
  conditionTrace        Json
  actionPreview         Json
  warnings              Json?
  simulatedByUserId     String
  tenant                Tenant                               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule             @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  version               EnterpriseAutomationRuleVersion?     @relation(fields: [versionId], references: [id], onDelete: SetNull)
  createdAt             DateTime                             @default(now())

  @@index([tenantId, status, createdAt])
  @@index([ruleId, createdAt])
}
"""

def bounds(text, model):
    start=text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening=text.find("{",start)
    depth=0
    for i in range(opening,len(text)):
        if text[i]=="{":
            depth+=1
        elif text[i]=="}":
            depth-=1
            if depth==0:
                return start,i
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum EnterpriseAutomationRuleVersionStatus" not in schema:
    anchor="enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema=schema.replace(anchor,ENUMS+anchor,1)

start,end=bounds(schema,"Tenant")
block=schema[start:end]
for relation in [
    "  enterpriseAutomationRuleVersions EnterpriseAutomationRuleVersion[]",
    "  enterpriseAutomationTemplates EnterpriseAutomationTemplate[]",
    "  enterpriseAutomationSimulations EnterpriseAutomationSimulation[]",
]:
    field=relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor=block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block=block[:anchor]+"\n"+relation+block[anchor:]
schema=schema[:start]+block+schema[end:]

start,end=bounds(schema,"EnterpriseAutomationRule")
block=schema[start:end]
for line in [
    "  designerState         Json?",
    "  publishedVersion      Int?",
    "  lastValidatedAt       DateTime?",
    "  versions              EnterpriseAutomationRuleVersion[]",
    "  simulations           EnterpriseAutomationSimulation[]",
]:
    field=line.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor=block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate EnterpriseAutomationRule anchor.")
        block=block[:anchor]+"\n"+line+block[anchor:]
schema=schema[:start]+block+schema[end:]

if "model EnterpriseAutomationRuleVersion {" not in schema:
    schema += "\n"+MODELS

path.write_text(schema)
print("Visual rule builder schema applied.")

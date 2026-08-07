from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum EnterpriseAutomationRuleStatus {
  DRAFT
  ACTIVE
  PAUSED
  DISABLED
}

enum EnterpriseAutomationTriggerType {
  DOMAIN_EVENT
  SCHEDULE
  RECORD_CONDITION
  MANUAL
}

enum EnterpriseAutomationActionType {
  START_WORKFLOW
  CREATE_NOTIFICATION
  CREATE_TASK
  PUBLISH_EVENT
  LOG_ACTIVITY
}

enum EnterpriseAutomationRunStatus {
  PENDING
  RUNNING
  COMPLETED
  COMPLETED_WITH_WARNINGS
  FAILED
  SKIPPED
}

"""

MODELS = """
model EnterpriseAutomationRule {
  id                    String                          @id @default(cuid())
  tenantId              String
  ruleKey               String
  name                  String
  description           String?
  status                EnterpriseAutomationRuleStatus @default(DRAFT)
  priority              Int                             @default(100)
  stopOnFailure         Boolean                         @default(true)
  createdByUserId       String
  tenant                Tenant                          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  triggers              EnterpriseAutomationTrigger[]
  actions               EnterpriseAutomationAction[]
  runs                  EnterpriseAutomationRun[]
  createdAt             DateTime                        @default(now())
  updatedAt             DateTime                        @updatedAt

  @@unique([tenantId, ruleKey])
  @@index([tenantId, status, priority])
}

model EnterpriseAutomationTrigger {
  id                    String                           @id @default(cuid())
  tenantId              String
  ruleId                String
  triggerType           EnterpriseAutomationTriggerType
  eventType             String?
  scheduleExpression    String?
  recordType            String?
  conditionExpression   Json?
  enabled               Boolean                          @default(true)
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule         @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@index([tenantId, triggerType, enabled])
  @@index([ruleId])
  @@index([eventType])
}

model EnterpriseAutomationAction {
  id                    String                          @id @default(cuid())
  tenantId              String
  ruleId                String
  sequence              Int
  actionType            EnterpriseAutomationActionType
  actionKey             String
  configuration         Json
  enabled               Boolean                         @default(true)
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule         @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  actionRuns            EnterpriseAutomationActionRun[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([ruleId, sequence])
  @@index([tenantId, actionType, enabled])
  @@index([ruleId])
}

model EnterpriseAutomationRun {
  id                    String                         @id @default(cuid())
  tenantId              String
  ruleId                String
  runNumber             String
  status                EnterpriseAutomationRunStatus @default(PENDING)
  triggerType           EnterpriseAutomationTriggerType
  triggerReference      String?
  startedAt             DateTime?
  completedAt           DateTime?
  input                  Json?
  output                 Json?
  errorMessage          String?
  initiatedByUserId     String?
  tenant                Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule       @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  actionRuns            EnterpriseAutomationActionRun[]
  createdAt             DateTime                       @default(now())

  @@unique([tenantId, runNumber])
  @@index([tenantId, status, createdAt])
  @@index([ruleId, createdAt])
}

model EnterpriseAutomationActionRun {
  id                    String                         @id @default(cuid())
  tenantId              String
  automationRunId       String
  actionId              String
  sequence              Int
  status                EnterpriseAutomationRunStatus @default(PENDING)
  startedAt             DateTime?
  completedAt           DateTime?
  output                 Json?
  errorMessage          String?
  tenant                Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  automationRun         EnterpriseAutomationRun        @relation(fields: [automationRunId], references: [id], onDelete: Cascade)
  action                EnterpriseAutomationAction     @relation(fields: [actionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                       @default(now())

  @@index([tenantId, status, createdAt])
  @@index([automationRunId, sequence])
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

if "enum EnterpriseAutomationRuleStatus" not in schema:
    anchor="enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema=schema.replace(anchor,ENUMS+anchor,1)

start,end=bounds(schema,"Tenant")
block=schema[start:end]
for relation in [
    "  enterpriseAutomationRules EnterpriseAutomationRule[]",
    "  enterpriseAutomationTriggers EnterpriseAutomationTrigger[]",
    "  enterpriseAutomationActions EnterpriseAutomationAction[]",
    "  enterpriseAutomationRuns EnterpriseAutomationRun[]",
    "  enterpriseAutomationActionRuns EnterpriseAutomationActionRun[]",
]:
    field=relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor=block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block=block[:anchor]+"\n"+relation+block[anchor:]
schema=schema[:start]+block+schema[end:]

if "model EnterpriseAutomationRule {" not in schema:
    schema += "\n"+MODELS

path.write_text(schema)
print("Enterprise automation rules schema applied.")

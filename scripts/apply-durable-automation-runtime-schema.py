from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum EnterpriseAutomationRuntimeStatus {
  RUNNING
  WAITING
  COMPLETED
  FAILED
  CANCELLED
}

enum EnterpriseAutomationRuntimeNodeStatus {
  READY
  RUNNING
  WAITING
  COMPLETED
  FAILED
  SKIPPED
}

enum EnterpriseAutomationRuntimeSignalType {
  APPROVAL
  RESUME
  CANCEL
}

"""

MODELS = """
model EnterpriseAutomationRuntimeExecution {
  id                    String                            @id @default(cuid())
  tenantId              String
  ruleId                String
  versionId             String?
  executionNumber       String
  status                EnterpriseAutomationRuntimeStatus @default(RUNNING)
  graphSnapshot         Json
  input                 Json
  context               Json?
  wakeAt                DateTime?
  initiatedByUserId     String?
  startedAt             DateTime                          @default(now())
  completedAt           DateTime?
  lastError             String?
  tenant                Tenant                            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rule                  EnterpriseAutomationRule          @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  nodes                 EnterpriseAutomationRuntimeNode[]
  signals               EnterpriseAutomationRuntimeSignal[]
  createdAt             DateTime                          @default(now())
  updatedAt             DateTime                          @updatedAt

  @@unique([tenantId, executionNumber])
  @@index([tenantId, status, wakeAt])
  @@index([ruleId, createdAt])
}

model EnterpriseAutomationRuntimeNode {
  id                    String                               @id @default(cuid())
  tenantId              String
  executionId           String
  nodeId                String
  nodeType              String
  branchKey             String?
  status                EnterpriseAutomationRuntimeNodeStatus @default(READY)
  attemptCount          Int                                  @default(0)
  availableAt           DateTime?
  timeoutAt             DateTime?
  waitReason            String?
  payload               Json?
  result                Json?
  lastError             String?
  startedAt             DateTime?
  completedAt           DateTime?
  tenant                Tenant                               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  execution             EnterpriseAutomationRuntimeExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                             @default(now())
  updatedAt             DateTime                             @updatedAt

  @@index([tenantId, status, availableAt])
  @@index([executionId, status])
  @@index([executionId, nodeId])
}

model EnterpriseAutomationRuntimeSignal {
  id                    String                                @id @default(cuid())
  tenantId              String
  executionId           String
  signalType            EnterpriseAutomationRuntimeSignalType
  correlationKey        String
  payload               Json?
  consumedAt            DateTime?
  createdByUserId       String?
  tenant                Tenant                                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  execution             EnterpriseAutomationRuntimeExecution  @relation(fields: [executionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                              @default(now())

  @@index([tenantId, signalType, consumedAt])
  @@index([executionId, correlationKey, consumedAt])
}
"""

def bounds(text, model):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for i in range(opening, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum EnterpriseAutomationRuntimeStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
for relation in [
    "  enterpriseAutomationRuntimeExecutions EnterpriseAutomationRuntimeExecution[]",
    "  enterpriseAutomationRuntimeNodes EnterpriseAutomationRuntimeNode[]",
    "  enterpriseAutomationRuntimeSignals EnterpriseAutomationRuntimeSignal[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "EnterpriseAutomationRule")
block = schema[start:end]
relation = "  runtimeExecutions      EnterpriseAutomationRuntimeExecution[]"
if "\n  runtimeExecutions " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate EnterpriseAutomationRule relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model EnterpriseAutomationRuntimeExecution {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Durable enterprise automation runtime schema applied.")

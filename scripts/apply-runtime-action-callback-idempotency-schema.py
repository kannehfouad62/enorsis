from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum EnterpriseAutomationRuntimeActionStatus {
  PENDING
  DISPATCHED
  ACKNOWLEDGED
  COMPLETED
  FAILED
  CANCELLED
}

enum EnterpriseAutomationRuntimeCallbackStatus {
  RECEIVED
  ACCEPTED
  REJECTED
  DUPLICATE
}

"""

MODELS = """
model EnterpriseAutomationRuntimeAction {
  id                    String                                  @id @default(cuid())
  tenantId              String
  executionId           String
  runtimeNodeId         String
  nodeId                String
  actionType            String
  idempotencyKey        String
  status                EnterpriseAutomationRuntimeActionStatus @default(PENDING)
  requestPayload        Json
  responsePayload       Json?
  externalReference     String?
  dispatchCount         Int                                     @default(0)
  lastDispatchedAt      DateTime?
  acknowledgedAt        DateTime?
  completedAt           DateTime?
  failedAt              DateTime?
  lastError             String?
  tenant                Tenant                                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  execution             EnterpriseAutomationRuntimeExecution    @relation(fields: [executionId], references: [id], onDelete: Cascade)
  runtimeNode           EnterpriseAutomationRuntimeNode         @relation(fields: [runtimeNodeId], references: [id], onDelete: Cascade)
  callbacks             EnterpriseAutomationRuntimeCallback[]
  createdAt             DateTime                                @default(now())
  updatedAt             DateTime                                @updatedAt

  @@unique([tenantId, idempotencyKey])
  @@index([executionId, status, createdAt])
  @@index([runtimeNodeId, status])
}

model EnterpriseAutomationRuntimeCallback {
  id                    String                                   @id @default(cuid())
  tenantId              String
  actionId              String
  callbackKey           String
  status                EnterpriseAutomationRuntimeCallbackStatus @default(RECEIVED)
  payload               Json
  source                String?
  receivedAt            DateTime                                 @default(now())
  processedAt           DateTime?
  tenant                Tenant                                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  action                EnterpriseAutomationRuntimeAction         @relation(fields: [actionId], references: [id], onDelete: Cascade)

  @@unique([tenantId, callbackKey])
  @@index([actionId, status, receivedAt])
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

if "enum EnterpriseAutomationRuntimeActionStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

for model, relation in [
    ("Tenant", "  enterpriseAutomationRuntimeActions EnterpriseAutomationRuntimeAction[]"),
    ("Tenant", "  enterpriseAutomationRuntimeCallbacks EnterpriseAutomationRuntimeCallback[]"),
    ("EnterpriseAutomationRuntimeExecution", "  actions               EnterpriseAutomationRuntimeAction[]"),
    ("EnterpriseAutomationRuntimeNode", "  actions               EnterpriseAutomationRuntimeAction[]"),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit(f"Could not locate {model} relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if "model EnterpriseAutomationRuntimeAction {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Runtime action callback and idempotency schema applied.")

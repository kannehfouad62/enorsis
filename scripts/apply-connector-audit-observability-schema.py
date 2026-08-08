from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterpriseAutomationConnectorAuditType {
  CREATED
  UPDATED
  ACTIVATED
  DISABLED
  ARCHIVED
  TESTED
  EXECUTED
  EXECUTION_FAILED
  POLICY_BLOCKED
}

'''

MODEL = '''
model EnterpriseAutomationConnectorAudit {
  id                    String                                 @id @default(cuid())
  tenantId              String
  connectorId           String
  type                  EnterpriseAutomationConnectorAuditType
  actorUserId           String?
  actionId              String?
  message               String?
  metadata              Json?
  tenant                Tenant                                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  connector             EnterpriseAutomationConnector          @relation(fields: [connectorId], references: [id], onDelete: Cascade)
  createdAt             DateTime                               @default(now())

  @@index([tenantId, createdAt])
  @@index([connectorId, createdAt])
  @@index([connectorId, type, createdAt])
}
'''

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

if "enum EnterpriseAutomationConnectorAuditType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
relation = "  enterpriseAutomationConnectorAudits EnterpriseAutomationConnectorAudit[]"
if "\n  enterpriseAutomationConnectorAudits " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "EnterpriseAutomationConnector")
block = schema[start:end]

for line in [
    "  ownerUserId           String?",
    "  policyTag             String?",
    "  maxDailyExecutions    Int?",
    "  consecutiveFailures   Int                                  @default(0)",
    "  successCount          Int                                  @default(0)",
    "  failureCount          Int                                  @default(0)",
    "  lastFailureAt         DateTime?",
    "  lastFailureMessage    String?",
]:
    field = line.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate connector field anchor.")
        block = block[:anchor] + "\n" + line + block[anchor:]

relation = "  audits                EnterpriseAutomationConnectorAudit[]"
if "\n  audits " not in block:
    anchor = block.find("\n  createdAt")
    block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model EnterpriseAutomationConnectorAudit {" not in schema:
    schema += "\n" + MODEL

path.write_text(schema)
print("Connector audit and observability schema applied.")

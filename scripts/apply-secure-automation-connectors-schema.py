from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterpriseAutomationConnectorType {
  HTTP
  WEBHOOK
  DOMAIN_EVENT
}

enum EnterpriseAutomationConnectorStatus {
  ACTIVE
  DISABLED
  ARCHIVED
}

'''

MODEL = '''
model EnterpriseAutomationConnector {
  id                    String                               @id @default(cuid())
  tenantId              String
  connectorKey          String
  name                  String
  type                  EnterpriseAutomationConnectorType
  status                EnterpriseAutomationConnectorStatus @default(ACTIVE)
  baseUrl               String?
  allowedHosts          Json?
  secretEnvKey          String?
  defaultHeaders        Json?
  configuration         Json?
  timeoutMs             Int                                  @default(15000)
  createdByUserId       String?
  updatedByUserId       String?
  tenant                Tenant                               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt             DateTime                             @default(now())
  updatedAt             DateTime                             @updatedAt

  @@unique([tenantId, connectorKey])
  @@index([tenantId, status, type])
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

if "enum EnterpriseAutomationConnectorType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
relation = "  enterpriseAutomationConnectors EnterpriseAutomationConnector[]"
if "\n  enterpriseAutomationConnectors " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model EnterpriseAutomationConnector {" not in schema:
    schema += "\n" + MODEL

path.write_text(schema)
print("Secure enterprise automation connector schema applied.")

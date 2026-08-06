from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterpriseActivityVisibility {
  TENANT
  RESTRICTED
  PRIVATE
  PLATFORM
}

enum EnterpriseActivitySeverity {
  INFO
  SUCCESS
  WARNING
  ERROR
  CRITICAL
}

'''

MODELS = '''model EnterpriseActivity {
  id                  String                       @id @default(cuid())
  tenantId            String
  activityType        String
  sourceModule        String
  title               String
  description         String?
  severity            EnterpriseActivitySeverity  @default(INFO)
  visibility          EnterpriseActivityVisibility @default(TENANT)
  actorUserId         String?
  actorName           String?
  actorRole           String?
  subjectType         String?
  subjectId           String?
  subjectLabel        String?
  parentType          String?
  parentId            String?
  actionUrl           String?
  eventId             String?
  correlationId       String?
  ipAddress           String?
  userAgent           String?
  metadata            Json?
  occurredAt          DateTime                     @default(now())
  tenant              Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accessRules         EnterpriseActivityAccessRule[]
  createdAt           DateTime                     @default(now())

  @@index([tenantId, occurredAt])
  @@index([tenantId, activityType, occurredAt])
  @@index([subjectType, subjectId, occurredAt])
  @@index([actorUserId, occurredAt])
  @@index([correlationId])
  @@index([eventId])
}

model EnterpriseActivityAccessRule {
  id                  String             @id @default(cuid())
  activityId          String
  userId              String?
  role                String?
  serviceKey          String?
  active              Boolean            @default(true)
  expiresAt           DateTime?
  activity            EnterpriseActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  createdAt           DateTime           @default(now())

  @@index([activityId, active])
  @@index([userId, active])
  @@index([role, active])
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

if "enum EnterpriseActivityVisibility" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  enterpriseActivities" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  enterpriseActivities EnterpriseActivity[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model EnterpriseActivity {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Universal activity timeline schema applied.")

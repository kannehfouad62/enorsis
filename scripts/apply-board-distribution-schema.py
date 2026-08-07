from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ExecutiveBoardRecipientGroupType {
  BOARD
  AUDIT_COMMITTEE
  RISK_COMMITTEE
  PROCUREMENT_COMMITTEE
  FINANCE_COMMITTEE
  EXECUTIVE_LEADERSHIP
  CUSTOM
}

enum ExecutiveBoardRecipientStatus {
  ACTIVE
  INACTIVE
}

enum ExecutiveBoardDistributionStatus {
  PENDING
  SENT
  PARTIALLY_SENT
  FAILED
  CANCELLED
}

enum ExecutiveBoardDeliveryStatus {
  PENDING
  SENT
  DELIVERED
  OPENED
  FAILED
  REVOKED
}

"""

MODELS = """
model ExecutiveBoardRecipientGroup {
  id                    String                            @id @default(cuid())
  tenantId              String
  name                  String
  groupType             ExecutiveBoardRecipientGroupType
  description           String?
  active                Boolean                           @default(true)
  createdByUserId       String
  tenant                Tenant                            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members               ExecutiveBoardRecipient[]
  distributions         ExecutiveBoardDistribution[]
  createdAt             DateTime                          @default(now())
  updatedAt             DateTime                          @updatedAt

  @@unique([tenantId, name])
  @@index([tenantId, groupType, active])
}

model ExecutiveBoardRecipient {
  id                    String                         @id @default(cuid())
  tenantId              String
  groupId               String
  name                  String
  email                 String
  title                 String?
  organization          String?
  status                ExecutiveBoardRecipientStatus @default(ACTIVE)
  userId                String?
  tenant                Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  group                 ExecutiveBoardRecipientGroup   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  deliveries            ExecutiveBoardDelivery[]
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  @@unique([groupId, email])
  @@index([tenantId, status])
  @@index([email])
}

model ExecutiveBoardDistribution {
  id                    String                            @id @default(cuid())
  tenantId              String
  boardPackId           String
  recipientGroupId      String
  distributionNumber    String
  status                ExecutiveBoardDistributionStatus @default(PENDING)
  subject               String
  message               String?
  initiatedByUserId     String
  initiatedAt           DateTime                          @default(now())
  completedAt           DateTime?
  tenant                Tenant                            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  boardPack             ExecutiveBoardPack                @relation(fields: [boardPackId], references: [id], onDelete: Cascade)
  recipientGroup        ExecutiveBoardRecipientGroup      @relation(fields: [recipientGroupId], references: [id], onDelete: Restrict)
  deliveries            ExecutiveBoardDelivery[]
  createdAt             DateTime                          @default(now())
  updatedAt             DateTime                          @updatedAt

  @@unique([tenantId, distributionNumber])
  @@index([tenantId, status, initiatedAt])
  @@index([boardPackId, initiatedAt])
}

model ExecutiveBoardDelivery {
  id                    String                       @id @default(cuid())
  tenantId              String
  distributionId        String
  recipientId           String
  status                ExecutiveBoardDeliveryStatus @default(PENDING)
  accessTokenHash       String
  sentAt                DateTime?
  deliveredAt           DateTime?
  openedAt              DateTime?
  revokedAt             DateTime?
  failureReason         String?
  tenant                Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  distribution          ExecutiveBoardDistribution   @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  recipient             ExecutiveBoardRecipient      @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  accessEvents          ExecutiveBoardDeliveryAccessEvent[]
  createdAt             DateTime                     @default(now())
  updatedAt             DateTime                     @updatedAt

  @@unique([distributionId, recipientId])
  @@index([tenantId, status, createdAt])
  @@index([recipientId, createdAt])
}

model ExecutiveBoardDeliveryAccessEvent {
  id                    String                 @id @default(cuid())
  tenantId              String
  deliveryId            String
  eventType             String
  ipAddress             String?
  userAgent             String?
  occurredAt            DateTime               @default(now())
  tenant                Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  delivery              ExecutiveBoardDelivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)

  @@index([tenantId, occurredAt])
  @@index([deliveryId, occurredAt])
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

if "enum ExecutiveBoardRecipientGroupType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
for relation in [
    "  executiveBoardRecipientGroups ExecutiveBoardRecipientGroup[]",
    "  executiveBoardRecipients ExecutiveBoardRecipient[]",
    "  executiveBoardDistributions ExecutiveBoardDistribution[]",
    "  executiveBoardDeliveries ExecutiveBoardDelivery[]",
    "  executiveBoardDeliveryAccessEvents ExecutiveBoardDeliveryAccessEvent[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "ExecutiveBoardPack")
block = schema[start:end]
relation = "  distributions         ExecutiveBoardDistribution[]"
if "\n  distributions " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate ExecutiveBoardPack relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model ExecutiveBoardRecipientGroup {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Executive board distribution schema applied.")

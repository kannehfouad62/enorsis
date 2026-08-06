from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterpriseNotificationChannel {
  IN_APP
  EMAIL
  MOBILE_PUSH
  SMS
  MICROSOFT_TEAMS
  SLACK
  WEBHOOK
}

enum EnterpriseNotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum EnterpriseNotificationStatus {
  QUEUED
  PROCESSING
  DELIVERED
  PARTIALLY_DELIVERED
  FAILED
  CANCELLED
  DEAD_LETTER
}

enum EnterpriseNotificationDeliveryStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
  SKIPPED
  DEAD_LETTER
}

'''

MODELS = '''model EnterpriseNotificationTemplate {
  id                 String                         @id @default(cuid())
  tenantId           String?
  key                String
  name               String
  description        String?
  eventType          String?
  channel            EnterpriseNotificationChannel
  subjectTemplate    String?
  bodyTemplate       String
  actionUrlTemplate  String?
  active             Boolean                        @default(true)
  locale             String                         @default("en-US")
  version            Int                            @default(1)
  tenant             Tenant?                        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  notifications      EnterpriseNotification[]
  createdAt          DateTime                       @default(now())
  updatedAt          DateTime                       @updatedAt

  @@unique([tenantId, key, channel, locale, version])
  @@index([eventType, channel, active])
}

model EnterpriseNotificationPreference {
  id                 String                         @id @default(cuid())
  tenantId           String
  userId             String
  eventType          String
  channel            EnterpriseNotificationChannel
  enabled            Boolean                        @default(true)
  digestOnly         Boolean                        @default(false)
  quietHoursStart    Int?
  quietHoursEnd      Int?
  locale             String                         @default("en-US")
  tenant             Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt          DateTime                       @default(now())
  updatedAt          DateTime                       @updatedAt

  @@unique([tenantId, userId, eventType, channel])
  @@index([userId, enabled])
}

model EnterpriseNotification {
  id                 String                         @id @default(cuid())
  tenantId           String
  templateId         String?
  eventId            String?
  eventType          String
  recipientUserId    String?
  recipientAddress   String?
  title              String
  message            String
  actionUrl          String?
  priority           EnterpriseNotificationPriority @default(NORMAL)
  status             EnterpriseNotificationStatus   @default(QUEUED)
  data               Json?
  correlationId      String?
  scheduledAt        DateTime                        @default(now())
  processingAt       DateTime?
  completedAt        DateTime?
  readAt             DateTime?
  archivedAt         DateTime?
  errorMessage       String?
  tenant             Tenant                          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  template           EnterpriseNotificationTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  deliveries         EnterpriseNotificationDelivery[]
  createdAt          DateTime                        @default(now())
  updatedAt          DateTime                        @updatedAt

  @@index([tenantId, recipientUserId, readAt])
  @@index([status, scheduledAt])
  @@index([eventType, createdAt])
  @@index([correlationId])
}

model EnterpriseNotificationDelivery {
  id                 String                               @id @default(cuid())
  notificationId     String
  channel            EnterpriseNotificationChannel
  status             EnterpriseNotificationDeliveryStatus @default(PENDING)
  destination        String?
  provider           String?
  providerMessageId  String?
  attemptCount       Int                                  @default(0)
  maxAttempts        Int                                  @default(3)
  availableAt        DateTime                             @default(now())
  processingAt       DateTime?
  deliveredAt        DateTime?
  errorMessage       String?
  responseMetadata   Json?
  notification       EnterpriseNotification               @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  createdAt          DateTime                             @default(now())
  updatedAt          DateTime                             @updatedAt

  @@index([status, availableAt])
  @@index([notificationId, channel])
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

if "enum EnterpriseNotificationChannel" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
relations = [
    "  enterpriseNotificationTemplates EnterpriseNotificationTemplate[]",
    "  enterpriseNotificationPreferences EnterpriseNotificationPreference[]",
    "  enterpriseNotifications EnterpriseNotification[]",
]
for relation in relations:
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model EnterpriseNotificationTemplate {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Unified notification center schema applied.")

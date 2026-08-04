from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum IntegrationProvider" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum IntegrationProvider {
  SAP
  ORACLE
  MICROSOFT_DYNAMICS
  NETSUITE
  WORKDAY
  COUPA
  ARIBA
  GENERIC_REST
  GENERIC_SFTP
  GENERIC_WEBHOOK
  OTHER
}

enum IntegrationStatus {
  DRAFT
  ACTIVE
  PAUSED
  ERROR
  RETIRED
}

enum IntegrationDirection {
  INBOUND
  OUTBOUND
  BIDIRECTIONAL
}

enum IntegrationJobStatus {
  QUEUED
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
  DEAD_LETTER
}

enum IntegrationEventStatus {
  RECEIVED
  VALIDATED
  PROCESSED
  REJECTED
  FAILED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate Tenant model.")
tenant_block = tenant_match.group(1)
if "integrations" not in tenant_block:
    tenant_block += "\n  integrations          IntegrationConnection[]"
    schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model IntegrationConnection {" not in schema:
    schema += r"""

model IntegrationConnection {
  id                    String               @id @default(cuid())
  tenantId              String
  key                   String
  name                  String
  provider              IntegrationProvider
  direction             IntegrationDirection
  status                IntegrationStatus    @default(DRAFT)
  baseUrl               String?
  secretReference       String?
  webhookSecretHash     String?
  outboundEnabled       Boolean              @default(false)
  inboundEnabled        Boolean              @default(false)
  retryLimit            Int                  @default(3)
  timeoutSeconds        Int                  @default(30)
  lastSuccessfulAt      DateTime?
  lastFailedAt          DateTime?
  lastError             String?
  createdByUserId       String
  tenant                Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  mappings              IntegrationMapping[]
  jobs                  IntegrationJob[]
  events                IntegrationEvent[]
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@unique([tenantId, key])
  @@index([tenantId, status, provider])
}

model IntegrationMapping {
  id                    String                @id @default(cuid())
  integrationId         String
  key                   String
  name                  String
  sourceEntity          String
  targetEntity          String
  version               Int                   @default(1)
  isActive              Boolean               @default(true)
  fieldMappings         Json
  transforms            Json?
  validationRules       Json?
  integration           IntegrationConnection @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@unique([integrationId, key, version])
  @@index([integrationId, isActive])
}

model IntegrationJob {
  id                    String                @id @default(cuid())
  integrationId         String
  mappingId             String?
  direction             IntegrationDirection
  status                IntegrationJobStatus @default(QUEUED)
  resourceType          String?
  resourceId            String?
  payload               Json
  response              Json?
  attemptCount          Int                   @default(0)
  nextAttemptAt         DateTime?
  startedAt             DateTime?
  completedAt           DateTime?
  errorMessage          String?
  correlationId         String?
  createdByUserId       String?
  integration           IntegrationConnection @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@index([integrationId, status, nextAttemptAt])
  @@index([resourceType, resourceId])
  @@index([correlationId])
}

model IntegrationEvent {
  id                    String                 @id @default(cuid())
  integrationId         String
  externalEventId       String?
  eventType             String
  status                IntegrationEventStatus @default(RECEIVED)
  headers               Json?
  payload               Json
  signatureValid        Boolean?
  processedAt           DateTime?
  rejectedReason        String?
  errorMessage          String?
  correlationId         String?
  integration           IntegrationConnection  @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  receivedAt            DateTime                @default(now())

  @@unique([integrationId, externalEventId])
  @@index([integrationId, status, receivedAt])
  @@index([correlationId])
}
"""

path.write_text(schema)
print("Integration Hub schema applied.")

from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum EnterpriseConnectorType {
  REST_API
  SOAP_API
  WEBHOOK
  SFTP
  DATABASE
  MESSAGE_QUEUE
  ERP
  IDENTITY
  COLLABORATION
  PAYMENT
  CUSTOM
}

enum EnterpriseConnectorStatus {
  DRAFT
  ACTIVE
  PAUSED
  ERROR
  DISABLED
}

enum EnterpriseCredentialType {
  API_KEY
  BEARER_TOKEN
  BASIC_AUTH
  OAUTH2
  CLIENT_CERTIFICATE
  SSH_KEY
  DATABASE_CREDENTIAL
  CUSTOM
}

enum IntegrationSyncDirection {
  INBOUND
  OUTBOUND
  BIDIRECTIONAL
}

enum IntegrationSyncStatus {
  QUEUED
  RUNNING
  SUCCEEDED
  PARTIALLY_SUCCEEDED
  FAILED
  CANCELLED
  DEAD_LETTER
}

'''

MODELS = '''model EnterpriseConnectorDefinition {
  id                    String                    @id @default(cuid())
  key                   String                    @unique
  name                  String
  description           String?
  provider              String
  connectorType         EnterpriseConnectorType
  version               String                    @default("1.0")
  active                Boolean                   @default(true)
  supportsInbound       Boolean                   @default(false)
  supportsOutbound      Boolean                   @default(true)
  supportsWebhooks      Boolean                   @default(false)
  supportsIncremental   Boolean                   @default(false)
  configurationSchema   Json?
  capabilityMetadata    Json?
  connections           EnterpriseConnectorConnection[]
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@index([provider, connectorType])
}

model EnterpriseConnectorConnection {
  id                    String                    @id @default(cuid())
  tenantId              String
  connectorDefinitionId String
  name                  String
  status                EnterpriseConnectorStatus @default(DRAFT)
  environment           String                    @default("PRODUCTION")
  baseUrl               String?
  configuration         Json?
  healthStatus          String                    @default("UNKNOWN")
  lastHealthCheckAt     DateTime?
  lastSuccessfulSyncAt  DateTime?
  lastFailedSyncAt      DateTime?
  createdByUserId       String?
  updatedByUserId       String?
  tenant                Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  connectorDefinition   EnterpriseConnectorDefinition @relation(fields: [connectorDefinitionId], references: [id], onDelete: Restrict)
  credentials           EnterpriseConnectorCredential[]
  mappings              EnterpriseConnectorMapping[]
  syncRuns              EnterpriseIntegrationSyncRun[]
  webhookEndpoints      EnterpriseWebhookEndpoint[]
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@unique([tenantId, name])
  @@index([tenantId, status])
  @@index([connectorDefinitionId, status])
}

model EnterpriseConnectorCredential {
  id                    String                   @id @default(cuid())
  connectionId          String
  name                  String
  credentialType        EnterpriseCredentialType
  secretReference       String
  metadata              Json?
  expiresAt             DateTime?
  rotatedAt             DateTime?
  status                String                   @default("ACTIVE")
  connection            EnterpriseConnectorConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@index([connectionId, status])
  @@index([expiresAt])
}

model EnterpriseConnectorMapping {
  id                    String                   @id @default(cuid())
  connectionId          String
  name                  String
  sourceObject          String
  targetObject          String
  direction             IntegrationSyncDirection
  fieldMappings         Json
  transformationRules   Json?
  active                Boolean                  @default(true)
  connection            EnterpriseConnectorConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@unique([connectionId, name])
  @@index([connectionId, active])
}

model EnterpriseIntegrationSyncRun {
  id                    String                 @id @default(cuid())
  connectionId          String
  mappingId             String?
  direction             IntegrationSyncDirection
  status                IntegrationSyncStatus @default(QUEUED)
  triggerType           String                 @default("MANUAL")
  correlationId         String?
  cursor                String?
  requestedByUserId     String?
  recordsRead           Int                    @default(0)
  recordsWritten        Int                    @default(0)
  recordsSkipped        Int                    @default(0)
  recordsFailed         Int                    @default(0)
  startedAt             DateTime?
  completedAt           DateTime?
  errorMessage          String?
  summary               Json?
  connection            EnterpriseConnectorConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([connectionId, status, createdAt])
  @@index([correlationId])
}

model EnterpriseWebhookEndpoint {
  id                    String                   @id @default(cuid())
  connectionId          String
  key                   String
  path                  String
  active                Boolean                  @default(true)
  signingSecretReference String?
  acceptedEventTypes    Json?
  lastReceivedAt        DateTime?
  connection            EnterpriseConnectorConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@unique([connectionId, key])
  @@unique([path])
  @@index([connectionId, active])
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

if "enum EnterpriseConnectorType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  enterpriseConnectorConnections" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  enterpriseConnectorConnections EnterpriseConnectorConnection[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model EnterpriseConnectorDefinition {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Integration Hub schema applied.")

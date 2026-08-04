from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum ApiClientStatus" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum ApiClientStatus {
  ACTIVE
  SUSPENDED
  REVOKED
}

enum ApiCredentialStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

enum ApiRequestOutcome {
  ALLOWED
  DENIED
  RATE_LIMITED
  ERROR
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
if "apiClients" not in tenant_block:
    tenant_block += "\n  apiClients            ApiClient[]"
    schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model ApiClient {" not in schema:
    schema += r"""

model ApiClient {
  id                    String          @id @default(cuid())
  tenantId              String
  name                  String
  description           String?
  status                ApiClientStatus @default(ACTIVE)
  allowedScopes         String[]
  allowedIpCidrs        String[]
  requestsPerMinute     Int             @default(60)
  requestsPerDay        Int             @default(10000)
  createdByUserId       String
  suspendedAt           DateTime?
  revokedAt             DateTime?
  tenant                Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  credentials           ApiCredential[]
  requestLogs           ApiRequestLog[]
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([tenantId, status, createdAt])
}

model ApiCredential {
  id                    String              @id @default(cuid())
  apiClientId           String
  name                  String
  prefix                String
  secretHash            String              @unique
  status                ApiCredentialStatus @default(ACTIVE)
  expiresAt             DateTime?
  lastUsedAt            DateTime?
  revokedAt             DateTime?
  createdByUserId       String
  apiClient             ApiClient           @relation(fields: [apiClientId], references: [id], onDelete: Cascade)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([apiClientId, status])
  @@index([prefix, status])
}

model ApiRequestLog {
  id                    String            @id @default(cuid())
  apiClientId           String?
  credentialId          String?
  tenantId              String?
  requestId             String
  method                String
  path                  String
  scope                 String?
  outcome               ApiRequestOutcome
  statusCode            Int
  ipAddress             String?
  userAgent             String?
  durationMs            Int
  errorCode             String?
  metadata              Json?
  apiClient             ApiClient?        @relation(fields: [apiClientId], references: [id], onDelete: SetNull)
  createdAt             DateTime          @default(now())

  @@index([tenantId, createdAt])
  @@index([apiClientId, outcome, createdAt])
  @@index([requestId])
}
"""

path.write_text(schema)
print("Enterprise API Gateway schema applied.")

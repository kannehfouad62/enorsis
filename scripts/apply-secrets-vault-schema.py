from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum VaultSecretStatus {
  ACTIVE
  DISABLED
  REVOKED
  EXPIRED
}

enum VaultSecretType {
  API_KEY
  BEARER_TOKEN
  BASIC_AUTH
  OAUTH_CLIENT_SECRET
  PRIVATE_KEY
  CERTIFICATE
  SSH_KEY
  WEBHOOK_SECRET
  DATABASE_CREDENTIAL
  ENCRYPTION_KEY
  CUSTOM
}

enum VaultSecretAccessAction {
  READ
  WRITE
  ROTATE
  REVOKE
}

'''

MODELS = '''model VaultSecret {
  id                    String            @id @default(cuid())
  tenantId              String?
  key                   String
  name                  String
  description           String?
  secretType            VaultSecretType
  status                VaultSecretStatus @default(ACTIVE)
  provider              String?
  environment           String            @default("PRODUCTION")
  currentVersion        Int               @default(1)
  expiresAt             DateTime?
  lastRotatedAt         DateTime?
  lastAccessedAt        DateTime?
  accessCount           Int               @default(0)
  createdByUserId       String?
  updatedByUserId       String?
  tenant                Tenant?           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  versions              VaultSecretVersion[]
  accessPolicies        VaultSecretAccessPolicy[]
  accessLogs            VaultSecretAccessLog[]
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@unique([tenantId, key])
  @@index([tenantId, status])
  @@index([provider, environment])
  @@index([expiresAt])
}

model VaultSecretVersion {
  id                    String      @id @default(cuid())
  secretId              String
  version               Int
  ciphertext            String
  initializationVector  String
  authenticationTag     String
  keyVersion            String
  checksum              String
  createdByUserId       String?
  rotatedFromVersion    Int?
  expiresAt             DateTime?
  secret                VaultSecret @relation(fields: [secretId], references: [id], onDelete: Cascade)
  createdAt             DateTime    @default(now())

  @@unique([secretId, version])
  @@index([secretId, createdAt])
}

model VaultSecretAccessPolicy {
  id                    String                  @id @default(cuid())
  secretId              String
  role                  String?
  userId                String?
  serviceKey            String?
  action                VaultSecretAccessAction
  active                Boolean                 @default(true)
  expiresAt             DateTime?
  secret                VaultSecret             @relation(fields: [secretId], references: [id], onDelete: Cascade)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  @@index([secretId, action, active])
  @@index([userId, active])
  @@index([serviceKey, active])
}

model VaultSecretAccessLog {
  id                    String                  @id @default(cuid())
  secretId              String
  action                VaultSecretAccessAction
  actorUserId           String?
  serviceKey            String?
  success               Boolean
  reason                String?
  ipAddress             String?
  userAgent             String?
  correlationId         String?
  secretVersion         Int?
  secret                VaultSecret             @relation(fields: [secretId], references: [id], onDelete: Cascade)
  createdAt             DateTime                @default(now())

  @@index([secretId, createdAt])
  @@index([actorUserId, createdAt])
  @@index([serviceKey, createdAt])
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

if "enum VaultSecretStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  vaultSecrets" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  vaultSecrets VaultSecret[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model VaultSecret {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Secrets vault schema applied.")

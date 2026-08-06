from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum PlatformCertificationStatus {
  DRAFT
  RUNNING
  PASSED
  PASSED_WITH_WARNINGS
  FAILED
  CANCELLED
}

enum PlatformReadinessCheckStatus {
  PASS
  WARN
  FAIL
  SKIPPED
}

enum PlatformReadinessSeverity {
  INFO
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

'''

MODELS = '''model PlatformCertificationRun {
  id                    String                      @id @default(cuid())
  tenantId              String?
  name                  String
  releaseVersion        String?
  environment           String                      @default("PRODUCTION")
  status                PlatformCertificationStatus @default(DRAFT)
  startedAt             DateTime?
  completedAt           DateTime?
  initiatedByUserId     String?
  certifiedByUserId     String?
  certifiedAt           DateTime?
  summary               Json?
  releaseBlocked        Boolean                     @default(true)
  tenant                Tenant?                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  checks                PlatformReadinessCheck[]
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt

  @@index([tenantId, createdAt])
  @@index([status, createdAt])
  @@index([environment, releaseVersion])
}

model PlatformReadinessCheck {
  id                    String                       @id @default(cuid())
  certificationRunId    String
  key                   String
  category              String
  name                  String
  description           String?
  status                PlatformReadinessCheckStatus
  severity              PlatformReadinessSeverity
  releaseBlocking       Boolean                      @default(false)
  observedValue         String?
  expectedValue         String?
  evidence              Json?
  remediation           String?
  checkedAt             DateTime                     @default(now())
  durationMs            Int?
  certificationRun      PlatformCertificationRun     @relation(fields: [certificationRunId], references: [id], onDelete: Cascade)
  createdAt             DateTime                     @default(now())

  @@unique([certificationRunId, key])
  @@index([status, severity])
  @@index([category, status])
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

if "enum PlatformCertificationStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  platformCertificationRuns" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  platformCertificationRuns PlatformCertificationRun[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model PlatformCertificationRun {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Platform readiness schema applied.")

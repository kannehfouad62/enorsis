from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum PlatformJobStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum PlatformJobExecutionStatus {
  QUEUED
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
  DEAD_LETTER
}

enum PlatformJobTriggerType {
  SCHEDULED
  MANUAL
  EVENT
  RETRY
}

'''

MODELS = '''model PlatformJobDefinition {
  id                  String            @id @default(cuid())
  key                 String            @unique
  name                String
  description         String?
  status              PlatformJobStatus @default(ACTIVE)
  handlerKey          String
  scheduleExpression  String?
  timeZone            String            @default("UTC")
  maxAttempts         Int               @default(3)
  retryDelaySeconds   Int               @default(300)
  timeoutSeconds      Int               @default(300)
  concurrencyKey      String?
  tenantScoped        Boolean           @default(false)
  payloadTemplate     Json?
  lastQueuedAt        DateTime?
  lastStartedAt       DateTime?
  lastCompletedAt     DateTime?
  lastSucceededAt     DateTime?
  lastFailedAt        DateTime?
  nextRunAt           DateTime?
  executions          PlatformJobExecution[]
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([status, nextRunAt])
  @@index([handlerKey])
}

model PlatformJobExecution {
  id                  String                     @id @default(cuid())
  jobDefinitionId     String
  tenantId            String?
  status              PlatformJobExecutionStatus @default(QUEUED)
  triggerType         PlatformJobTriggerType
  payload             Json?
  result              Json?
  attemptCount        Int                        @default(0)
  queuedAt            DateTime                   @default(now())
  startedAt           DateTime?
  completedAt         DateTime?
  lockedAt            DateTime?
  lockedBy            String?
  errorCode           String?
  errorMessage        String?
  correlationId       String?
  requestedByUserId   String?
  jobDefinition       PlatformJobDefinition      @relation(fields: [jobDefinitionId], references: [id], onDelete: Cascade)
  tenant              Tenant?                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  attempts            PlatformJobAttempt[]
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt

  @@index([status, queuedAt])
  @@index([jobDefinitionId, status])
  @@index([tenantId, status])
  @@index([correlationId])
}

model PlatformJobAttempt {
  id            String                     @id @default(cuid())
  executionId   String
  attemptNumber Int
  status        PlatformJobExecutionStatus
  workerId      String?
  startedAt     DateTime                   @default(now())
  completedAt   DateTime?
  durationMs    Int?
  errorCode     String?
  errorMessage  String?
  result        Json?
  execution     PlatformJobExecution       @relation(fields: [executionId], references: [id], onDelete: Cascade)
  createdAt     DateTime                   @default(now())

  @@unique([executionId, attemptNumber])
  @@index([status, startedAt])
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

if "enum PlatformJobStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  platformJobExecutions" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  platformJobExecutions PlatformJobExecution[]" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model PlatformJobDefinition {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Background job platform schema applied.")

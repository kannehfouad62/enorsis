from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ExecutiveBoardReportScheduleStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum ExecutiveBoardReportScheduleFrequency {
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum ExecutiveBoardReportScheduleRunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}

"""

MODELS = """
model ExecutiveBoardReportSchedule {
  id                    String                                  @id @default(cuid())
  tenantId              String
  definitionId          String
  name                  String
  status                ExecutiveBoardReportScheduleStatus      @default(ACTIVE)
  frequency             ExecutiveBoardReportScheduleFrequency
  dayOfMonth            Int                                     @default(1)
  monthOfYear           Int?
  hourUtc               Int                                     @default(8)
  nextRunAt             DateTime
  lastRunAt             DateTime?
  lastBoardPackId       String?
  generateFinalized     Boolean                                 @default(false)
  createdByUserId       String
  tenant                Tenant                                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  definition            ExecutiveBoardPackDefinition             @relation(fields: [definitionId], references: [id], onDelete: Cascade)
  runs                  ExecutiveBoardReportScheduleRun[]
  createdAt             DateTime                                 @default(now())
  updatedAt             DateTime                                 @updatedAt

  @@unique([tenantId, definitionId, frequency])
  @@index([tenantId, status, nextRunAt])
  @@index([definitionId])
}

model ExecutiveBoardReportScheduleRun {
  id                    String                                      @id @default(cuid())
  tenantId              String
  scheduleId            String
  status                ExecutiveBoardReportScheduleRunStatus       @default(PENDING)
  scheduledFor          DateTime
  startedAt             DateTime?
  completedAt           DateTime?
  boardPackId           String?
  errorMessage          String?
  sourceFingerprint     String?
  tenant                Tenant                                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedule              ExecutiveBoardReportSchedule                 @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  createdAt             DateTime                                     @default(now())

  @@unique([scheduleId, scheduledFor])
  @@index([tenantId, status, scheduledFor])
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

if "enum ExecutiveBoardReportScheduleStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
for relation in [
    "  executiveBoardReportSchedules ExecutiveBoardReportSchedule[]",
    "  executiveBoardReportScheduleRuns ExecutiveBoardReportScheduleRun[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "ExecutiveBoardPackDefinition")
block = schema[start:end]
relation = "  schedules             ExecutiveBoardReportSchedule[]"
if "\n  schedules " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate ExecutiveBoardPackDefinition relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model ExecutiveBoardReportSchedule {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Executive board reporting schedule schema applied.")

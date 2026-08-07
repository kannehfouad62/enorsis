from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ExecutiveSynthesisStatus {
  PENDING
  COMPLETED
  FAILED
}

"""

MODELS = """
model ExecutiveSynthesisRun {
  id                    String                   @id @default(cuid())
  tenantId              String
  runNumber             String
  status                ExecutiveSynthesisStatus @default(PENDING)
  provider              String                   @default("OPENAI")
  model                  String
  sourceInsightCount     Int                      @default(0)
  startedAt             DateTime?
  completedAt           DateTime?
  initiatedByUserId     String?
  promptVersion         String
  inputFingerprint      String
  responseId            String?
  summary               Json?
  errorMessage          String?
  tenant                Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  synthesis             ExecutiveSynthesis?
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@unique([tenantId, runNumber])
  @@index([tenantId, status, createdAt])
  @@index([inputFingerprint])
}

model ExecutiveSynthesis {
  id                    String                @id @default(cuid())
  tenantId              String
  synthesisRunId        String                @unique
  title                 String
  executiveSummary      String
  keyRisks              Json
  keyOpportunities      Json
  recommendedPriorities Json
  governanceNotes       Json
  confidenceStatement   String
  sourceInsightIds      Json
  tenant                Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  synthesisRun          ExecutiveSynthesisRun @relation(fields: [synthesisRunId], references: [id], onDelete: Cascade)
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  @@index([tenantId, createdAt])
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

if "enum ExecutiveSynthesisStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  executiveSynthesisRuns ExecutiveSynthesisRun[]",
    "  executiveSyntheses ExecutiveSynthesis[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model ExecutiveSynthesisRun {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("OpenAI executive synthesis schema applied.")

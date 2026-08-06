from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum ProcurementProcessCertificationStatus {
  DRAFT
  RUNNING
  PASSED
  PASSED_WITH_WARNINGS
  FAILED
  CERTIFIED
  CANCELLED
}

enum ProcurementProcessCheckStatus {
  PASS
  WARN
  FAIL
  SKIPPED
}

enum ProcurementProcessCheckSeverity {
  INFO
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

'''

MODELS = '''
model ProcurementProcessCertification {
  id                   String                                @id @default(cuid())
  tenantId             String
  journeyId            String
  certificationNumber  String
  status               ProcurementProcessCertificationStatus @default(DRAFT)
  releaseBlocked       Boolean                               @default(true)
  summary              Json?
  startedAt            DateTime?
  completedAt          DateTime?
  certifiedAt          DateTime?
  initiatedByUserId    String?
  certifiedByUserId    String?
  tenant               Tenant                                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  journey              RequisitionOrderJourney               @relation(fields: [journeyId], references: [id], onDelete: Cascade)
  checks               ProcurementProcessCheck[]
  createdAt            DateTime                              @default(now())
  updatedAt            DateTime                              @updatedAt

  @@unique([tenantId, certificationNumber])
  @@index([tenantId, status, createdAt])
  @@index([journeyId])
}

model ProcurementProcessCheck {
  id               String                          @id @default(cuid())
  certificationId  String
  key              String
  category         String
  name             String
  description      String?
  status           ProcurementProcessCheckStatus
  severity         ProcurementProcessCheckSeverity
  releaseBlocking  Boolean                         @default(false)
  observedValue    String?
  expectedValue    String?
  remediation      String?
  evidence         Json?
  certification    ProcurementProcessCertification @relation(fields: [certificationId], references: [id], onDelete: Cascade)
  createdAt        DateTime                        @default(now())

  @@unique([certificationId, key])
  @@index([status, severity])
  @@index([category, status])
}
'''

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

if "enum ProcurementProcessCertificationStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

for model, relation in [
    ("Tenant", "  procurementProcessCertifications ProcurementProcessCertification[]"),
    ("RequisitionOrderJourney", "  processCertifications ProcurementProcessCertification[]"),
]:
    start, end = bounds(schema, model)
    block = schema[start:end]
    field_name = relation.split()[0].strip()
    if f"\n  {field_name}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            anchor = block.find("\n  milestones")
        if anchor < 0:
            raise SystemExit(f"Could not locate relation anchor in {model}.")
        block = block[:anchor] + "\n" + relation + block[anchor:]
        schema = schema[:start] + block + schema[end:]

if "model ProcurementProcessCertification {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Procurement process certification schema applied.")

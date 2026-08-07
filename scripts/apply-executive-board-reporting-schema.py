from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ExecutiveBoardPackType {
  CEO
  CFO
  COO
  CPO
  CRO
  ESG
  SUPPLY_CHAIN
  GENERAL_BOARD
}

enum ExecutiveBoardPackStatus {
  DRAFT
  GENERATED
  FINALIZED
  ARCHIVED
}

enum ExecutiveBoardPackPeriodType {
  MONTHLY
  QUARTERLY
  ANNUAL
  AD_HOC
}

"""

MODELS = """
model ExecutiveBoardPackDefinition {
  id                    String                           @id @default(cuid())
  tenantId              String
  definitionKey         String
  name                  String
  description           String?
  packType              ExecutiveBoardPackType
  active                Boolean                          @default(true)
  defaultPeriodType     ExecutiveBoardPackPeriodType
  includeAiSynthesis    Boolean                          @default(true)
  includeGovernance     Boolean                          @default(true)
  includeKpis           Boolean                          @default(true)
  includeRisks          Boolean                          @default(true)
  includeOpportunities  Boolean                          @default(true)
  sectionConfiguration  Json?
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  packs                 ExecutiveBoardPack[]
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, definitionKey])
  @@index([tenantId, packType, active])
}

model ExecutiveBoardPack {
  id                    String                           @id @default(cuid())
  tenantId              String
  definitionId          String
  packNumber            String
  title                 String
  packType              ExecutiveBoardPackType
  status                ExecutiveBoardPackStatus         @default(DRAFT)
  periodType            ExecutiveBoardPackPeriodType
  periodStart           DateTime
  periodEnd             DateTime
  generatedAt           DateTime?
  generatedByUserId     String?
  finalizedAt           DateTime?
  finalizedByUserId     String?
  executiveSummary      String?
  sourceSnapshot        Json
  sectionSnapshot       Json
  governanceSnapshot    Json
  sourceFingerprint     String
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  definition            ExecutiveBoardPackDefinition     @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  createdAt             DateTime                         @default(now())
  updatedAt             DateTime                         @updatedAt

  @@unique([tenantId, packNumber])
  @@index([tenantId, packType, status, periodEnd])
  @@index([definitionId, createdAt])
  @@index([sourceFingerprint])
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

if "enum ExecutiveBoardPackType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  executiveBoardPackDefinitions ExecutiveBoardPackDefinition[]",
    "  executiveBoardPacks ExecutiveBoardPack[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model ExecutiveBoardPackDefinition {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Executive board reporting schema applied.")

from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum ExecutiveBoardPackExportFormat {
  PDF
  DOCX
  XLSX
  PPTX
}

enum ExecutiveBoardPackExportStatus {
  GENERATED
  FAILED
}

"""

MODELS = """
model ExecutiveBoardPackExport {
  id                    String                              @id @default(cuid())
  tenantId              String
  boardPackId           String
  format                ExecutiveBoardPackExportFormat
  status                ExecutiveBoardPackExportStatus
  fileName              String
  contentType           String
  byteSize              Int?
  generatedByUserId     String
  generatedAt           DateTime                            @default(now())
  sourceFingerprint     String
  errorMessage          String?
  tenant                Tenant                              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  boardPack             ExecutiveBoardPack                  @relation(fields: [boardPackId], references: [id], onDelete: Cascade)

  @@index([tenantId, generatedAt])
  @@index([boardPackId, generatedAt])
  @@index([format, status])
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

if "enum ExecutiveBoardPackExportFormat" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
relation = "  executiveBoardPackExports ExecutiveBoardPackExport[]"
if "\n  executiveBoardPackExports " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

start, end = bounds(schema, "ExecutiveBoardPack")
block = schema[start:end]
relation = "  exports               ExecutiveBoardPackExport[]"
if "\n  exports " not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate ExecutiveBoardPack relation anchor.")
    block = block[:anchor] + "\n" + relation + block[anchor:]
schema = schema[:start] + block + schema[end:]

if "model ExecutiveBoardPackExport {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Executive board pack export schema applied.")

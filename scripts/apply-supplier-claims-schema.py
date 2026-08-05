from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum SupplierClaimType {
  DAMAGED_GOODS
  SHORT_SHIPMENT
  OVER_SHIPMENT
  WRONG_ITEM
  QUALITY_DEFECT
  WARRANTY
  LATE_DELIVERY
  PRICING_ERROR
  FREIGHT_DAMAGE
  OTHER
}

enum SupplierClaimStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  PARTIALLY_ACCEPTED
  REJECTED
  SETTLED
  CLOSED
  CANCELLED
}

enum ReturnDisposition {
  RETURN_TO_SUPPLIER
  REPLACE
  REPAIR
  SCRAP
  USE_AS_IS
  CREDIT_ONLY
}

enum SupplierRecoveryType {
  CREDIT_NOTE
  DEBIT_MEMO
  CASH_REFUND
  REPLACEMENT
  SERVICE_CREDIT
  PRICE_ADJUSTMENT
  OTHER
}

enum SupplierRecoveryStatus {
  PROPOSED
  AGREED
  ISSUED
  RECEIVED
  APPLIED
  DISPUTED
  CANCELLED
}

"""

MODELS = """
model SupplierClaim {
  id                 String              @id @default(cuid())
  tenantId           String
  supplierId         String
  claimNumber        String
  type               SupplierClaimType
  status             SupplierClaimStatus @default(DRAFT)
  title              String
  description        String
  purchaseOrderId    String?
  receiptId          String?
  shipmentId         String?
  invoiceId          String?
  currencyCode       String              @default("USD")
  claimedAmount      Decimal             @default(0) @db.Decimal(18, 2)
  acceptedAmount     Decimal             @default(0) @db.Decimal(18, 2)
  settledAmount      Decimal             @default(0) @db.Decimal(18, 2)
  quantityAffected   Decimal?            @db.Decimal(18, 4)
  unitOfMeasure      String?
  detectedAt         DateTime
  submittedAt        DateTime?
  respondedAt        DateTime?
  resolvedAt         DateTime?
  dueAt              DateTime?
  ownerUserId        String
  supplierResponse   String?
  internalAssessment String?
  rootCause          String?
  correctiveAction   String?
  disposition        ReturnDisposition?
  tenant             Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier           Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  evidence           SupplierClaimEvidence[]
  recoveries         SupplierRecovery[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  @@unique([tenantId, claimNumber])
  @@index([tenantId, status, dueAt])
  @@index([supplierId, status, detectedAt])
}

model SupplierClaimEvidence {
  id               String        @id @default(cuid())
  supplierClaimId  String
  fileName         String
  fileUrl          String
  mimeType         String?
  description      String?
  uploadedByUserId String
  claim            SupplierClaim @relation(fields: [supplierClaimId], references: [id], onDelete: Cascade)
  createdAt        DateTime      @default(now())

  @@index([supplierClaimId, createdAt])
}

model SupplierRecovery {
  id               String                 @id @default(cuid())
  supplierClaimId  String
  type             SupplierRecoveryType
  status           SupplierRecoveryStatus @default(PROPOSED)
  referenceNumber  String?
  amount           Decimal                @db.Decimal(18, 2)
  currencyCode     String                 @default("USD")
  proposedAt       DateTime               @default(now())
  agreedAt         DateTime?
  issuedAt         DateTime?
  receivedAt       DateTime?
  appliedAt        DateTime?
  notes            String?
  claim            SupplierClaim          @relation(fields: [supplierClaimId], references: [id], onDelete: Cascade)
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  @@index([supplierClaimId, status])
}
"""

def bounds(text: str, model: str) -> tuple[int, int]:
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

def relation(model: str, line: str) -> None:
    global schema
    start, end = bounds(schema, model)
    block = schema[start:end]
    name = line.split()[0].strip()
    if name in block:
        return
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        anchor = block.find("\n  @@")
    if anchor < 0:
        raise SystemExit(f"Could not locate insertion anchor in {model}.")
    block = block[:anchor] + "\n" + line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum SupplierClaimType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

relation("Tenant", "  supplierClaims SupplierClaim[]")
relation("Supplier", "  supplierClaims SupplierClaim[]")

if "model SupplierClaim {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Returns, claims and supplier recovery schema applied.")

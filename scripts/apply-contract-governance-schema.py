from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum ContractAmendmentStatus" not in schema:
    anchor = "enum ContractStatus {"
    schema = schema.replace(
        anchor,
        """enum ContractAmendmentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
  EXECUTED
}

""" + anchor,
        1,
    )

contract_anchor = "  riskReviews         ContractRiskReview[]\n"
if "  amendments          ContractAmendment[]" not in schema:
    schema = schema.replace(
        contract_anchor,
        contract_anchor + "  amendments          ContractAmendment[]\n",
        1,
    )

if "model ContractAmendment {" not in schema:
    schema += r"""

model ContractAmendment {
  id              String                  @id @default(cuid())
  contractId      String
  amendmentNumber Int
  title           String
  description     String
  status          ContractAmendmentStatus @default(DRAFT)
  effectiveDate   DateTime?
  valueChange     Decimal?                @db.Decimal(18, 2)
  createdByUserId String
  approvedByUserId String?
  approvedAt      DateTime?
  executedAt      DateTime?
  contract        Contract                @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  @@unique([contractId, amendmentNumber])
  @@index([contractId, status])
}
"""

path.write_text(schema)
print("Contract governance schema applied.")

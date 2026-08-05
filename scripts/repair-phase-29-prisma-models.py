from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum SupplierPortalInvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

enum SupplierPortalUserStatus {
  INVITED
  ACTIVE
  SUSPENDED
  REVOKED
}

enum SupplierQuestionnaireStatus {
  DRAFT
  SENT
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REJECTED
  EXPIRED
}

enum SupplierPortalTaskStatus {
  OPEN
  IN_PROGRESS
  BLOCKED
  COMPLETED
  CANCELLED
}

enum SupplierPortalMessageDirection {
  BUYER_TO_SUPPLIER
  SUPPLIER_TO_BUYER
  INTERNAL
}

"""

MODELS = """
model SupplierPortalInvitation {
  id              String                         @id @default(cuid())
  tenantId        String
  supplierId      String?
  email           String
  contactName     String?
  tokenHash       String                         @unique
  status          SupplierPortalInvitationStatus @default(PENDING)
  invitedByUserId String
  expiresAt       DateTime
  acceptedAt      DateTime?
  revokedAt       DateTime?
  tenant          Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier        Supplier?                      @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt       DateTime                       @default(now())
  updatedAt       DateTime                       @updatedAt

  @@index([tenantId, status, expiresAt])
  @@index([supplierId, status])
  @@index([email, status])
}

model SupplierPortalUser {
  id          String                   @id @default(cuid())
  tenantId    String
  supplierId  String
  email       String
  name        String?
  jobTitle    String?
  phone       String?
  status      SupplierPortalUserStatus @default(INVITED)
  invitedAt   DateTime                 @default(now())
  activatedAt DateTime?
  lastLoginAt DateTime?
  suspendedAt DateTime?
  tenant      Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier    Supplier                 @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt   DateTime                 @default(now())
  updatedAt   DateTime                 @updatedAt

  @@unique([tenantId, supplierId, email])
  @@index([tenantId, status])
  @@index([supplierId, status])
}

model SupplierOnboardingQuestionnaire {
  id                String                      @id @default(cuid())
  tenantId          String
  supplierId        String
  title             String
  description       String?
  status            SupplierQuestionnaireStatus @default(DRAFT)
  version           Int                         @default(1)
  questions         Json
  answers           Json?
  completionPercent Int                         @default(0)
  dueAt             DateTime?
  sentAt            DateTime?
  submittedAt       DateTime?
  reviewedByUserId  String?
  reviewedAt        DateTime?
  reviewNotes       String?
  approvedAt        DateTime?
  tenant            Tenant                      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier          Supplier                    @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt         DateTime                    @default(now())
  updatedAt         DateTime                    @updatedAt

  @@index([tenantId, status, dueAt])
  @@index([supplierId, status])
}

model SupplierPortalTask {
  id                 String                   @id @default(cuid())
  tenantId           String
  supplierId         String
  title              String
  description        String?
  status             SupplierPortalTaskStatus @default(OPEN)
  dueAt              DateTime?
  buyerOwnerUserId   String
  supplierOwnerEmail String?
  blocker            String?
  completionEvidence String?
  completedAt        DateTime?
  tenant             Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier           Supplier                 @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  @@index([tenantId, status, dueAt])
  @@index([supplierId, status])
}

model SupplierPortalMessage {
  id           String                         @id @default(cuid())
  tenantId     String
  supplierId   String
  direction    SupplierPortalMessageDirection
  subject      String
  body         String
  authorUserId String?
  authorEmail  String?
  relatedType  String?
  relatedId    String?
  readAt       DateTime?
  tenant       Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier     Supplier                       @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt    DateTime                       @default(now())

  @@index([tenantId, supplierId, createdAt])
  @@index([relatedType, relatedId])
}
"""

def model_bounds(text: str, model_name: str) -> tuple[int, int]:
    start = text.find(f"model {model_name} {{")
    if start == -1:
        raise SystemExit(f"Could not locate {model_name} model.")

    opening = text.find("{", start)
    depth = 0

    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index

    raise SystemExit(f"Could not locate end of {model_name} model.")

def add_relation(model_name: str, relation_line: str) -> None:
    global schema

    start, end = model_bounds(schema, model_name)
    block = schema[start:end]
    field_name = relation_line.split()[0].strip()

    if f"\n  {field_name}" in block:
        return

    anchor = block.find("\n  createdAt")
    if anchor == -1:
        anchor = block.find("\n  @@")
    if anchor == -1:
        raise SystemExit(
            f"Could not locate a relation insertion anchor in {model_name}."
        )

    block = block[:anchor] + "\n" + relation_line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum SupplierPortalInvitationStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

add_relation(
    "Tenant",
    "  supplierPortalInvitations SupplierPortalInvitation[]",
)
add_relation(
    "Tenant",
    "  supplierPortalUsers SupplierPortalUser[]",
)
add_relation(
    "Tenant",
    "  supplierOnboardingQuestionnaires SupplierOnboardingQuestionnaire[]",
)
add_relation(
    "Tenant",
    "  supplierPortalTasks SupplierPortalTask[]",
)
add_relation(
    "Tenant",
    "  supplierPortalMessages SupplierPortalMessage[]",
)

add_relation(
    "Supplier",
    "  portalInvitations SupplierPortalInvitation[]",
)
add_relation(
    "Supplier",
    "  portalUsers SupplierPortalUser[]",
)
add_relation(
    "Supplier",
    "  onboardingQuestionnaires SupplierOnboardingQuestionnaire[]",
)
add_relation(
    "Supplier",
    "  portalTasks SupplierPortalTask[]",
)
add_relation(
    "Supplier",
    "  portalMessages SupplierPortalMessage[]",
)

missing_models = [
    name
    for name in [
        "SupplierPortalInvitation",
        "SupplierPortalUser",
        "SupplierOnboardingQuestionnaire",
        "SupplierPortalTask",
        "SupplierPortalMessage",
    ]
    if f"model {name} {{" not in schema
]

if missing_models:
    schema += "\n" + MODELS

path.write_text(schema)

print("Phase 29 Prisma models repaired.")
print("Verified models:")
for model_name in [
    "SupplierPortalInvitation",
    "SupplierPortalUser",
    "SupplierOnboardingQuestionnaire",
    "SupplierPortalTask",
    "SupplierPortalMessage",
]:
    print(f"  - {model_name}")

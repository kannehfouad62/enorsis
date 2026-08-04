from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

enums = """enum ProcurementCatalogStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  EXPIRED
  RETIRED
}

enum ProcurementCatalogType {
  INTERNAL
  SUPPLIER
  CONTRACT
  PUNCHOUT
}

enum CatalogItemStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

enum GuidedCartStatus {
  DRAFT
  SUBMITTED
  CONVERTED
  CANCELLED
}

"""

if "enum ProcurementCatalogStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

def add_relation(model_name, relation_line, anchor_text):
    global schema
    start = schema.find(f"model {model_name} {{")
    if start == -1:
        raise SystemExit(f"Could not locate {model_name} model.")
    end = schema.find("\n}", start)
    if end == -1:
        raise SystemExit(f"Could not locate the end of {model_name} model.")
    block = schema[start:end]
    relation_name = relation_line.split()[0].strip()
    if relation_name in block:
        return
    anchor = block.find(anchor_text)
    if anchor == -1:
        raise SystemExit(f"Could not locate insertion anchor in {model_name}.")
    block = block[:anchor] + "\n" + relation_line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

add_relation("Tenant", "  procurementCatalogs ProcurementCatalog[]", "\n  createdAt")
add_relation("Tenant", "  guidedCarts         GuidedCart[]", "\n  createdAt")
add_relation("Supplier", "  procurementCatalogs ProcurementCatalog[]", "\n  @@unique")

if "model ProcurementCatalog {" not in schema:
    schema += """
model ProcurementCatalog {
  id                String                   @id @default(cuid())
  tenantId          String
  supplierId        String?
  name              String
  description       String?
  type              ProcurementCatalogType
  status            ProcurementCatalogStatus @default(DRAFT)
  currencyCode      String                   @default("USD")
  validFrom         DateTime?
  validUntil        DateTime?
  contractReference String?
  punchoutUrl       String?
  ownerUserId       String
  activatedByUserId String?
  activatedAt       DateTime?
  tenant            Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  supplier          Supplier?                @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  items             ProcurementCatalogItem[]
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  @@unique([tenantId, name])
  @@index([tenantId, status, type])
}

model ProcurementCatalogItem {
  id                       String             @id @default(cuid())
  procurementCatalogId     String
  sku                      String
  supplierSku              String?
  name                     String
  description              String?
  category                 String
  status                   CatalogItemStatus  @default(ACTIVE)
  unitOfMeasure            String
  unitPrice                Decimal            @db.Decimal(18, 4)
  minimumQuantity          Decimal            @default(1) @db.Decimal(18, 4)
  maximumQuantity          Decimal?           @db.Decimal(18, 4)
  leadTimeDays             Int?
  manufacturer             String?
  manufacturerPartNo       String?
  preferred                Boolean            @default(false)
  environmentallyPreferred Boolean            @default(false)
  diversityQualified       Boolean            @default(false)
  imageUrl                 String?
  specifications           Json?
  catalog                  ProcurementCatalog @relation(fields: [procurementCatalogId], references: [id], onDelete: Cascade)
  cartItems                GuidedCartItem[]
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt

  @@unique([procurementCatalogId, sku])
  @@index([procurementCatalogId, status, category])
}

model GuidedCart {
  id               String           @id @default(cuid())
  tenantId         String
  requesterUserId  String
  name             String?
  status           GuidedCartStatus @default(DRAFT)
  currencyCode     String           @default("USD")
  totalAmount      Decimal          @default(0) @db.Decimal(18, 2)
  businessPurpose  String?
  deliveryLocation String?
  neededBy         DateTime?
  purchaseRequestId String?
  submittedAt      DateTime?
  convertedAt      DateTime?
  tenant           Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  items            GuidedCartItem[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([tenantId, requesterUserId, status])
}

model GuidedCartItem {
  id            String                 @id @default(cuid())
  guidedCartId  String
  catalogItemId String
  quantity      Decimal                @db.Decimal(18, 4)
  unitPrice     Decimal                @db.Decimal(18, 4)
  lineTotal     Decimal                @db.Decimal(18, 2)
  notes         String?
  cart          GuidedCart             @relation(fields: [guidedCartId], references: [id], onDelete: Cascade)
  catalogItem   ProcurementCatalogItem @relation(fields: [catalogItemId], references: [id], onDelete: Restrict)
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  @@unique([guidedCartId, catalogItemId])
}
"""

path.write_text(schema)
print("Enterprise catalog and guided buying schema applied.")

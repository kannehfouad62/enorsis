from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum LogisticsShipmentStatus {
  PLANNED
  BOOKED
  IN_TRANSIT
  DELAYED
  DELIVERED
  CANCELLED
}

enum LogisticsTransportMode {
  ROAD
  AIR
  OCEAN
  RAIL
  COURIER
  MULTIMODAL
}

enum LogisticsEventType {
  BOOKED
  PICKED_UP
  DEPARTED
  ARRIVED
  CUSTOMS_HOLD
  DELAYED
  OUT_FOR_DELIVERY
  DELIVERED
  EXCEPTION
}

"""

MODELS = """
model LogisticsCarrier {
  id            String   @id @default(cuid())
  tenantId      String
  code          String
  name          String
  contactName   String?
  contactEmail  String?
  contactPhone  String?
  scacCode      String?
  active        Boolean  @default(true)
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  shipments     LogisticsShipment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId, active, name])
}

model LogisticsShipment {
  id                    String                    @id @default(cuid())
  tenantId              String
  shipmentNumber        String
  purchaseOrderId       String?
  supplierId            String?
  carrierId             String?
  mode                  LogisticsTransportMode
  status                LogisticsShipmentStatus  @default(PLANNED)
  origin                String
  destination           String
  trackingNumber        String?
  incoterm              String?
  bookedAt              DateTime?
  pickupAt              DateTime?
  estimatedDeliveryAt   DateTime?
  actualDeliveryAt      DateTime?
  freightCost           Decimal?                 @db.Decimal(18, 2)
  currencyCode          String                   @default("USD")
  weight                Decimal?                 @db.Decimal(18, 4)
  weightUnit            String?
  packageCount          Int                      @default(0)
  delayRiskPercent      Int                      @default(0)
  exceptionSummary      String?
  proofOfDeliveryUrl    String?
  ownerUserId           String
  tenant                Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  carrier               LogisticsCarrier?        @relation(fields: [carrierId], references: [id], onDelete: SetNull)
  events                LogisticsTrackingEvent[]
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@unique([tenantId, shipmentNumber])
  @@index([tenantId, status, estimatedDeliveryAt])
  @@index([trackingNumber])
  @@index([supplierId, status])
}

model LogisticsTrackingEvent {
  id             String             @id @default(cuid())
  shipmentId     String
  type           LogisticsEventType
  occurredAt     DateTime
  location       String?
  description    String
  source         String?
  evidenceUrl    String?
  shipment       LogisticsShipment  @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  createdAt      DateTime           @default(now())

  @@index([shipmentId, occurredAt])
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
    raise SystemExit(f"Could not locate the end of {model_name} model.")

def insert_relation(model_name: str, relation_line: str) -> None:
    global schema
    start, end = model_bounds(schema, model_name)
    block = schema[start:end]
    relation_name = relation_line.split()[0].strip()
    if relation_name in block:
        return
    anchor = block.find("\n  createdAt")
    if anchor == -1:
        anchor = block.find("\n  @@")
    if anchor == -1:
        raise SystemExit(f"Could not locate insertion anchor in {model_name}.")
    block = block[:anchor] + "\n" + relation_line + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "enum LogisticsShipmentStatus" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

insert_relation("Tenant", "  logisticsCarriers LogisticsCarrier[]")
insert_relation("Tenant", "  logisticsShipments LogisticsShipment[]")

if "model LogisticsCarrier {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Logistics and freight management schema applied.")

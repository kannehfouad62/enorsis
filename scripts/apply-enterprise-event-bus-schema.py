from pathlib import Path
p=Path("prisma/schema.prisma")
s=p.read_text()

enums='''enum PlatformEventStatus {
  PENDING
  PROCESSING
  DELIVERED
  PARTIALLY_DELIVERED
  FAILED
  DEAD_LETTER
}

enum PlatformEventSubscriptionStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum PlatformEventDeliveryStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
  DEAD_LETTER
}

enum PlatformEventDeliveryType {
  INTERNAL_HANDLER
  WEBHOOK
  BACKGROUND_JOB
}

'''

models='''model PlatformEvent {
  id            String              @id @default(cuid())
  eventId       String              @unique
  tenantId      String?
  eventType     String
  aggregateType String?
  aggregateId   String?
  sourceModule  String
  schemaVersion Int                 @default(1)
  status        PlatformEventStatus @default(PENDING)
  payload       Json
  metadata      Json?
  correlationId String?
  causationId   String?
  actorUserId   String?
  occurredAt    DateTime            @default(now())
  availableAt   DateTime            @default(now())
  completedAt   DateTime?
  errorMessage  String?
  tenant        Tenant?             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  deliveries    PlatformEventDelivery[]
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@index([status, availableAt])
  @@index([tenantId, eventType, occurredAt])
  @@index([aggregateType, aggregateId])
  @@index([correlationId])
}

model PlatformEventSubscription {
  id                String                          @id @default(cuid())
  key               String                          @unique
  name              String
  description       String?
  status            PlatformEventSubscriptionStatus @default(ACTIVE)
  eventTypePattern  String
  deliveryType      PlatformEventDeliveryType
  handlerKey        String?
  webhookUrl        String?
  backgroundJobKey  String?
  tenantId          String?
  maxAttempts       Int                             @default(3)
  retryDelaySeconds Int                             @default(300)
  tenant            Tenant?                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  deliveries        PlatformEventDelivery[]
  createdAt         DateTime                        @default(now())
  updatedAt         DateTime                        @updatedAt

  @@index([status, eventTypePattern])
  @@index([tenantId, status])
}

model PlatformEventDelivery {
  id             String                      @id @default(cuid())
  eventId        String
  subscriptionId String
  status         PlatformEventDeliveryStatus @default(PENDING)
  attemptCount   Int                         @default(0)
  availableAt    DateTime                    @default(now())
  deliveredAt    DateTime?
  responseStatus Int?
  responseBody   String?
  errorMessage   String?
  lockedAt       DateTime?
  lockedBy       String?
  event          PlatformEvent               @relation(fields: [eventId], references: [id], onDelete: Cascade)
  subscription   PlatformEventSubscription   @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  createdAt      DateTime                    @default(now())
  updatedAt      DateTime                    @updatedAt

  @@unique([eventId, subscriptionId])
  @@index([status, availableAt])
  @@index([subscriptionId, status])
}
'''

def bounds(text, model):
    start=text.find(f"model {model} {{")
    if start<0: raise SystemExit(f"Could not locate {model} model.")
    opening=text.find("{",start); depth=0
    for i in range(opening,len(text)):
        if text[i]=="{": depth+=1
        elif text[i]=="}":
            depth-=1
            if depth==0: return start,i
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum PlatformEventStatus" not in s:
    anchor="enum AuditActorType {"
    if anchor not in s: raise SystemExit("Could not locate enum anchor.")
    s=s.replace(anchor,enums+anchor,1)

start,end=bounds(s,"Tenant")
block=s[start:end]
for relation in [
    "  platformEvents PlatformEvent[]",
    "  platformEventSubscriptions PlatformEventSubscription[]",
]:
    field=relation.split()[0]
    if f"\n  {field}" not in block:
        anchor=block.find("\n  createdAt")
        if anchor<0: raise SystemExit("Could not locate Tenant anchor.")
        block=block[:anchor]+"\n"+relation+block[anchor:]
s=s[:start]+block+s[end:]

if "model PlatformEvent {" not in s:
    s+="\n"+models

p.write_text(s)
print("Enterprise event bus schema applied.")

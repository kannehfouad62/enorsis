from pathlib import Path
p=Path("prisma/schema.prisma")
s=p.read_text()

enums='''enum CommercialEditionCode {
  COMMUNITY
  PROFESSIONAL
  ENTERPRISE_SAAS
  MANAGED_PAAS
}

enum TenantSubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  SUSPENDED
  CANCELLED
  EXPIRED
}

enum EntitlementEffect {
  ALLOW
  DENY
}

enum UsageMetricPeriod {
  LIFETIME
  DAILY
  MONTHLY
  ANNUAL
}

'''

models='''model CommercialEdition {
  id            String                @id @default(cuid())
  code          CommercialEditionCode @unique
  name          String
  description   String?
  rank          Int                   @default(0)
  active        Boolean               @default(true)
  features      EditionFeature[]
  subscriptions TenantSubscription[]
  usagePolicies UsagePolicy[]
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
}

model PlatformFeature {
  id              String              @id @default(cuid())
  key             String              @unique
  name            String
  description     String?
  groupKey        String
  active          Boolean             @default(true)
  managedPaaSOnly Boolean             @default(false)
  aiFeature       Boolean             @default(false)
  editionFeatures EditionFeature[]
  entitlements    TenantEntitlement[]
  usagePolicies   UsagePolicy[]
  usageCounters   UsageCounter[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([groupKey, active])
}

model EditionFeature {
  id        String            @id @default(cuid())
  editionId String
  featureId String
  enabled   Boolean           @default(true)
  edition   CommercialEdition @relation(fields: [editionId], references: [id], onDelete: Cascade)
  feature   PlatformFeature   @relation(fields: [featureId], references: [id], onDelete: Cascade)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@unique([editionId, featureId])
}

model TenantSubscription {
  id                     String                   @id @default(cuid())
  tenantId               String
  editionId              String
  status                 TenantSubscriptionStatus @default(TRIAL)
  startsAt               DateTime                 @default(now())
  trialEndsAt            DateTime?
  renewsAt               DateTime?
  endsAt                 DateTime?
  externalCustomerId     String?
  externalSubscriptionId String?
  tenant                 Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  edition                CommercialEdition        @relation(fields: [editionId], references: [id], onDelete: Restrict)
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  @@index([tenantId, status])
}

model TenantEntitlement {
  id              String            @id @default(cuid())
  tenantId        String
  featureId       String
  effect          EntitlementEffect @default(ALLOW)
  reason          String?
  startsAt        DateTime          @default(now())
  expiresAt       DateTime?
  grantedByUserId String?
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  feature         PlatformFeature   @relation(fields: [featureId], references: [id], onDelete: Cascade)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([tenantId, featureId])
}

model UsagePolicy {
  id           String             @id @default(cuid())
  featureId    String
  editionId    String?
  metricKey    String
  period       UsageMetricPeriod
  hardLimit    BigInt?
  warningLimit BigInt?
  feature      PlatformFeature    @relation(fields: [featureId], references: [id], onDelete: Cascade)
  edition      CommercialEdition? @relation(fields: [editionId], references: [id], onDelete: Cascade)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@unique([featureId, editionId, metricKey, period])
}

model UsageCounter {
  id          String            @id @default(cuid())
  tenantId    String
  featureId   String
  metricKey   String
  period      UsageMetricPeriod
  periodStart DateTime
  periodEnd   DateTime?
  value       BigInt            @default(0)
  tenant      Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  feature     PlatformFeature   @relation(fields: [featureId], references: [id], onDelete: Cascade)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([tenantId, featureId, metricKey, period, periodStart])
}
'''

def bounds(text,name):
    start=text.find(f"model {name} {{")
    if start<0: raise SystemExit(f"Could not locate {name} model.")
    opening=text.find("{",start)
    depth=0
    for i in range(opening,len(text)):
        if text[i]=="{": depth+=1
        elif text[i]=="}":
            depth-=1
            if depth==0: return start,i
    raise SystemExit(f"Could not locate end of {name} model.")

def relation(model,line):
    global s
    a,b=bounds(s,model)
    block=s[a:b]
    field=line.split()[0]
    if f"\n  {field}" in block:return
    pos=block.find("\n  createdAt")
    if pos<0:pos=block.find("\n  @@")
    if pos<0:raise SystemExit(f"No safe insertion anchor in {model}.")
    block=block[:pos]+"\n"+line+block[pos:]
    s=s[:a]+block+s[b:]

if "enum CommercialEditionCode" not in s:
    anchor="enum AuditActorType {"
    if anchor not in s: raise SystemExit("Could not locate AuditActorType enum.")
    s=s.replace(anchor,enums+anchor,1)

relation("Tenant","  subscriptions TenantSubscription[]")
relation("Tenant","  entitlements TenantEntitlement[]")
relation("Tenant","  usageCounters UsageCounter[]")

if "model CommercialEdition {" not in s:
    s+="\n"+models

p.write_text(s)
print("Licensing and entitlement schema applied.")

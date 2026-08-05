from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = '''enum TenantEnvironmentType {
  SHARED_SAAS
  DEDICATED_SAAS
  MANAGED_PAAS
  SELF_HOSTED
}

enum TenantDataResidency {
  UNITED_STATES
  CANADA
  EUROPEAN_UNION
  UNITED_KINGDOM
  AUSTRALIA
  SINGAPORE
  GLOBAL
  CUSTOM
}

'''

MODEL = '''model TenantConfiguration {
  id                       String                @id @default(cuid())
  tenantId                 String                @unique
  environmentType          TenantEnvironmentType @default(SHARED_SAAS)
  dataResidency            TenantDataResidency   @default(UNITED_STATES)
  customResidencyRegion    String?
  displayName              String?
  legalName                String?
  logoUrl                  String?
  primaryColor             String?
  secondaryColor           String?
  customDomain             String?
  locale                   String                @default("en-US")
  timeZone                 String                @default("UTC")
  defaultCurrencyCode      String                @default("USD")
  fiscalYearStartMonth     Int                   @default(1)
  dateFormat               String                @default("MM/dd/yyyy")
  numberFormat             String                @default("en-US")
  weekStartsOn             Int                   @default(1)
  requireMfa               Boolean               @default(false)
  enforceSso               Boolean               @default(false)
  sessionTimeoutMinutes    Int                   @default(480)
  passwordMinLength        Int                   @default(12)
  documentRetentionDays    Int                   @default(2555)
  auditRetentionDays       Int                   @default(2555)
  emailNotifications       Boolean               @default(true)
  inAppNotifications       Boolean               @default(true)
  dailyDigestEnabled       Boolean               @default(false)
  dailyDigestHour          Int                   @default(8)
  maxUsers                 Int?
  maxSuppliers             Int?
  maxStorageMb             BigInt?
  maxApiRequestsPerMonth   BigInt?
  supportTier              String                @default("STANDARD")
  maintenanceWindow        String?
  tenant                   Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdByUserId          String?
  updatedByUserId          String?
  createdAt                DateTime              @default(now())
  updatedAt                DateTime              @updatedAt

  @@index([environmentType, dataResidency])
}
'''

def bounds(text: str, model: str):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit(f"Could not locate end of {model} model.")

if "enum TenantEnvironmentType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]
if "\n  configurationProfile" not in block:
    anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate Tenant relation anchor.")
    block = block[:anchor] + "\n  configurationProfile TenantConfiguration?" + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model TenantConfiguration {" not in schema:
    schema += "\n" + MODEL

path.write_text(schema)
print("Tenant enterprise configuration schema applied.")

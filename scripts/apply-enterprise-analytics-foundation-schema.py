from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

ENUMS = """enum EnterpriseAnalyticsMetricType {
  COUNT
  SUM
  AVERAGE
  PERCENTAGE
  CURRENCY
  DURATION
  SCORE
  RATIO
}

enum EnterpriseAnalyticsPeriodType {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
  POINT_IN_TIME
}

enum EnterpriseAnalyticsTrendDirection {
  UP
  DOWN
  FLAT
  NOT_AVAILABLE
}

enum EnterpriseAnalyticsHealthStatus {
  GOOD
  WATCH
  WARNING
  CRITICAL
  NOT_AVAILABLE
}

enum EnterpriseAnalyticsRunStatus {
  PENDING
  RUNNING
  COMPLETED
  COMPLETED_WITH_WARNINGS
  FAILED
  CANCELLED
}

"""

MODELS = """
model EnterpriseAnalyticsMetricDefinition {
  id                    String                         @id @default(cuid())
  tenantId              String?
  metricKey             String
  name                  String
  description           String?
  domain                String
  category              String?
  metricType            EnterpriseAnalyticsMetricType
  unit                  String?
  currencyCode          String?
  targetValue           Decimal?                       @db.Decimal(24, 8)
  warningThreshold      Decimal?                       @db.Decimal(24, 8)
  criticalThreshold     Decimal?                       @db.Decimal(24, 8)
  higherIsBetter        Boolean                        @default(true)
  calculationVersion    String                         @default("1.0")
  sourceModule          String?
  drilldownPath         String?
  active                Boolean                        @default(true)
  metadata              Json?
  tenant                Tenant?                        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  snapshots             EnterpriseAnalyticsMetricSnapshot[]
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  @@unique([tenantId, metricKey])
  @@index([domain, category, active])
  @@index([tenantId, active])
}

model EnterpriseAnalyticsMetricSnapshot {
  id                    String                             @id @default(cuid())
  tenantId              String
  metricDefinitionId    String
  periodType            EnterpriseAnalyticsPeriodType
  periodStart           DateTime
  periodEnd             DateTime
  numericValue          Decimal                            @db.Decimal(24, 8)
  previousValue         Decimal?                           @db.Decimal(24, 8)
  targetValue           Decimal?                           @db.Decimal(24, 8)
  varianceValue         Decimal?                           @db.Decimal(24, 8)
  variancePercent       Decimal?                           @db.Decimal(18, 6)
  trendDirection        EnterpriseAnalyticsTrendDirection  @default(NOT_AVAILABLE)
  healthStatus          EnterpriseAnalyticsHealthStatus    @default(NOT_AVAILABLE)
  dimensionKey          String                             @default("ALL")
  dimensions            Json?
  calculationVersion    String
  sourceRecordCount     Int                                @default(0)
  calculatedAt          DateTime                           @default(now())
  aggregationRunId      String?
  tenant                Tenant                             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  metricDefinition      EnterpriseAnalyticsMetricDefinition @relation(fields: [metricDefinitionId], references: [id], onDelete: Cascade)
  aggregationRun        EnterpriseAnalyticsAggregationRun?  @relation(fields: [aggregationRunId], references: [id], onDelete: SetNull)
  createdAt             DateTime                           @default(now())

  @@unique([tenantId, metricDefinitionId, periodType, periodStart, dimensionKey])
  @@index([tenantId, periodType, periodStart])
  @@index([metricDefinitionId, calculatedAt])
  @@index([healthStatus, calculatedAt])
}

model EnterpriseAnalyticsAggregationRun {
  id                    String                       @id @default(cuid())
  tenantId              String
  runNumber             String
  scope                 String
  status                EnterpriseAnalyticsRunStatus @default(PENDING)
  periodType            EnterpriseAnalyticsPeriodType
  periodStart           DateTime
  periodEnd             DateTime
  startedAt             DateTime?
  completedAt           DateTime?
  initiatedByUserId     String?
  metricsRequested      Int                          @default(0)
  metricsCalculated     Int                          @default(0)
  warningCount          Int                          @default(0)
  failureCount          Int                          @default(0)
  summary               Json?
  tenant                Tenant                       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  snapshots             EnterpriseAnalyticsMetricSnapshot[]
  failures              EnterpriseAnalyticsAggregationFailure[]
  createdAt             DateTime                     @default(now())
  updatedAt             DateTime                     @updatedAt

  @@unique([tenantId, runNumber])
  @@index([tenantId, status, createdAt])
  @@index([periodType, periodStart])
}

model EnterpriseAnalyticsAggregationFailure {
  id                    String                           @id @default(cuid())
  tenantId              String
  aggregationRunId      String
  metricKey             String?
  sourceModule          String?
  severity              RequisitionOrderExceptionSeverity @default(MEDIUM)
  message               String
  details               Json?
  aggregationRun        EnterpriseAnalyticsAggregationRun @relation(fields: [aggregationRunId], references: [id], onDelete: Cascade)
  tenant                Tenant                           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt             DateTime                         @default(now())

  @@index([tenantId, createdAt])
  @@index([aggregationRunId])
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

if "enum EnterpriseAnalyticsMetricType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "Tenant")
block = schema[start:end]

for relation in [
    "  enterpriseAnalyticsMetricDefinitions EnterpriseAnalyticsMetricDefinition[]",
    "  enterpriseAnalyticsMetricSnapshots EnterpriseAnalyticsMetricSnapshot[]",
    "  enterpriseAnalyticsAggregationRuns EnterpriseAnalyticsAggregationRun[]",
    "  enterpriseAnalyticsAggregationFailures EnterpriseAnalyticsAggregationFailure[]",
]:
    field = relation.split()[0].strip()
    if f"\n  {field}" not in block:
        anchor = block.find("\n  createdAt")
        if anchor < 0:
            raise SystemExit("Could not locate Tenant relation anchor.")
        block = block[:anchor] + "\n" + relation + block[anchor:]

schema = schema[:start] + block + schema[end:]

if "model EnterpriseAnalyticsMetricDefinition {" not in schema:
    schema += "\n" + MODELS

path.write_text(schema)
print("Enterprise analytics foundation schema applied.")

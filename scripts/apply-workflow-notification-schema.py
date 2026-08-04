from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum WorkflowNotificationChannel" not in schema:
    anchor = "enum WorkflowEscalationStatus {"
    enums = """enum WorkflowNotificationChannel {
  IN_APP
  EMAIL
}

enum WorkflowNotificationStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
  CANCELLED
}

enum WorkflowNotificationType {
  TASK_ASSIGNED
  TASK_DUE_SOON
  TASK_OVERDUE
  TASK_ESCALATED
  WORKFLOW_COMPLETED
  WORKFLOW_REJECTED
  DELEGATION_STARTED
  DELEGATION_ENDING
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate WorkflowEscalationStatus enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate Tenant model.")

tenant_block = tenant_match.group(1)
if "workflowNotifications" not in tenant_block:
    tenant_block += "\n  workflowNotifications WorkflowNotification[]"
    schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model WorkflowNotification {" not in schema:
    schema += r"""

model WorkflowNotification {
  id                    String                     @id @default(cuid())
  tenantId              String
  workflowInstanceId    String?
  workflowTaskId        String?
  recipientUserId       String
  recipientEmail        String?
  type                  WorkflowNotificationType
  channel               WorkflowNotificationChannel
  status                WorkflowNotificationStatus @default(PENDING)
  subject               String
  message               String
  actionUrl             String?
  deduplicationKey      String
  scheduledAt           DateTime                   @default(now())
  processingStartedAt   DateTime?
  deliveredAt           DateTime?
  failedAt              DateTime?
  attemptCount          Int                        @default(0)
  nextAttemptAt         DateTime?
  errorMessage          String?
  metadata              Json?
  tenant                Tenant                     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt             DateTime                   @default(now())
  updatedAt             DateTime                   @updatedAt

  @@unique([tenantId, deduplicationKey])
  @@index([tenantId, recipientUserId, status, createdAt])
  @@index([status, scheduledAt, nextAttemptAt])
  @@index([workflowTaskId])
  @@index([workflowInstanceId])
}
"""

path.write_text(schema)
print("Workflow notification schema applied.")

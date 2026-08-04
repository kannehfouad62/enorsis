from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum WorkflowDefinitionStatus" not in schema:
    anchor = "enum AuditActorType {"
    enums = """enum WorkflowDefinitionStatus {
  DRAFT
  ACTIVE
  INACTIVE
  RETIRED
}

enum WorkflowStepType {
  APPROVAL
  REVIEW
  NOTIFICATION
  SYSTEM_TASK
  AI_REVIEW
}

enum WorkflowRoutingMode {
  SEQUENTIAL
  PARALLEL
  ANY_ONE
}

enum WorkflowInstanceStatus {
  PENDING
  RUNNING
  WAITING
  COMPLETED
  REJECTED
  CANCELLED
  FAILED
}

enum WorkflowTaskStatus {
  PENDING
  AVAILABLE
  IN_PROGRESS
  APPROVED
  REJECTED
  RETURNED
  SKIPPED
  ESCALATED
  CANCELLED
  FAILED
}

enum WorkflowDecision {
  APPROVE
  REJECT
  RETURN
  COMPLETE
}

enum WorkflowEscalationStatus {
  PENDING
  SENT
  ACKNOWLEDGED
  CANCELLED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

tenant_pattern = re.compile(r"(model Tenant \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
tenant_match = tenant_pattern.search(schema)
if not tenant_match:
    raise SystemExit("Could not locate Tenant model.")
tenant_block = tenant_match.group(1)
if "workflowDefinitions" not in tenant_block:
    tenant_block += "\n  workflowDefinitions   WorkflowDefinition[]"
    tenant_block += "\n  workflowInstances     WorkflowInstance[]"
    tenant_block += "\n  workflowDelegations   WorkflowDelegation[]"
    schema = schema[:tenant_match.start(1)] + tenant_block + schema[tenant_match.end(1):]

if "model WorkflowDefinition {" not in schema:
    schema += r"""

model WorkflowDefinition {
  id                    String                   @id @default(cuid())
  tenantId              String
  key                   String
  name                  String
  description           String?
  resourceType          String
  status                WorkflowDefinitionStatus @default(DRAFT)
  version               Int                      @default(1)
  triggerEvent          String
  conditionExpression   Json?
  createdByUserId       String
  activatedByUserId     String?
  activatedAt           DateTime?
  tenant                Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  steps                 WorkflowStep[]
  instances             WorkflowInstance[]
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@unique([tenantId, key, version])
  @@index([tenantId, resourceType, status])
}

model WorkflowStep {
  id                    String              @id @default(cuid())
  workflowDefinitionId  String
  key                   String
  name                  String
  description           String?
  type                  WorkflowStepType
  sequence              Int
  routingMode           WorkflowRoutingMode @default(SEQUENTIAL)
  conditionExpression   Json?
  assigneeRoles         String[]
  assigneeUserIds       String[]
  dueInHours            Int?
  escalationAfterHours  Int?
  escalationRoles       String[]
  allowDelegation       Boolean             @default(true)
  requiresComment       Boolean             @default(false)
  configuration         Json?
  workflowDefinition    WorkflowDefinition  @relation(fields: [workflowDefinitionId], references: [id], onDelete: Cascade)
  tasks                 WorkflowTask[]
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([workflowDefinitionId, key])
  @@unique([workflowDefinitionId, sequence])
  @@index([workflowDefinitionId, type])
}

model WorkflowInstance {
  id                    String                 @id @default(cuid())
  tenantId              String
  workflowDefinitionId  String
  resourceType          String
  resourceId            String
  status                WorkflowInstanceStatus @default(PENDING)
  currentSequence       Int                    @default(1)
  context               Json?
  startedByUserId       String
  startedAt             DateTime?
  completedAt           DateTime?
  cancelledAt           DateTime?
  failureReason         String?
  tenant                Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workflowDefinition    WorkflowDefinition     @relation(fields: [workflowDefinitionId], references: [id], onDelete: Restrict)
  tasks                 WorkflowTask[]
  escalations           WorkflowEscalation[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([tenantId, status, createdAt])
  @@index([resourceType, resourceId])
  @@index([workflowDefinitionId, status])
}

model WorkflowTask {
  id                    String             @id @default(cuid())
  workflowInstanceId    String
  workflowStepId        String
  status                WorkflowTaskStatus @default(PENDING)
  assigneeUserId        String?
  assigneeRole          String?
  delegatedFromUserId   String?
  availableAt           DateTime?
  dueAt                 DateTime?
  startedAt             DateTime?
  decidedAt             DateTime?
  decision              WorkflowDecision?
  comments              String?
  completedByUserId     String?
  workflowInstance      WorkflowInstance   @relation(fields: [workflowInstanceId], references: [id], onDelete: Cascade)
  workflowStep          WorkflowStep       @relation(fields: [workflowStepId], references: [id], onDelete: Restrict)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([assigneeUserId, status, dueAt])
  @@index([assigneeRole, status, dueAt])
  @@index([workflowInstanceId, status])
}

model WorkflowDelegation {
  id                    String    @id @default(cuid())
  tenantId              String
  delegatorUserId       String
  delegateUserId        String
  startsAt              DateTime
  endsAt                DateTime
  reason                String?
  isActive              Boolean   @default(true)
  tenant                Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([tenantId, delegatorUserId, isActive])
  @@index([delegateUserId, startsAt, endsAt])
}

model WorkflowEscalation {
  id                    String                   @id @default(cuid())
  workflowInstanceId    String
  workflowTaskId        String?
  status                WorkflowEscalationStatus @default(PENDING)
  escalationLevel       Int
  targetRoles           String[]
  targetUserIds         String[]
  reason                String
  scheduledAt           DateTime
  sentAt                DateTime?
  acknowledgedAt        DateTime?
  workflowInstance      WorkflowInstance         @relation(fields: [workflowInstanceId], references: [id], onDelete: Cascade)
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  @@index([status, scheduledAt])
  @@index([workflowInstanceId, status])
}
"""

path.write_text(schema)
print("Workflow engine schema applied.")

from pathlib import Path
import re

path = Path("prisma/schema.prisma")
schema = path.read_text()

if "enum AiAgentTaskStatus" not in schema:
    anchor = "enum AiAgentStatus {"
    enums = """enum AiAgentTaskStatus {
  DRAFT
  QUEUED
  WAITING_APPROVAL
  APPROVED
  RUNNING
  COMPLETED
  FAILED
  REJECTED
  CANCELLED
}

enum AiAgentTaskType {
  SUPPLIER_DUE_DILIGENCE
  RFX_DRAFT
  NEGOTIATION_PLAN
  CONTRACT_REVIEW
  SPEND_OPPORTUNITY
  RISK_MONITORING
  EXECUTIVE_BRIEF
  INVOICE_EXCEPTION_ANALYSIS
}

enum AiAgentApprovalDecision {
  PENDING
  APPROVED
  REJECTED
  RETURNED
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate AiAgentStatus enum anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

agent_pattern = re.compile(r"(model AiAgent \{.*?)(\n\s+createdAt\s+DateTime)", re.DOTALL)
agent_match = agent_pattern.search(schema)
if not agent_match:
    raise SystemExit("Could not locate AiAgent model.")
agent_block = agent_match.group(1)
if "tasks" not in agent_block:
    agent_block += "\n  tasks                 AiAgentTask[]"
    schema = schema[:agent_match.start(1)] + agent_block + schema[agent_match.end(1):]

if "model AiAgentTask {" not in schema:
    schema += r"""

model AiAgentTask {
  id                    String            @id @default(cuid())
  tenantId              String
  agentId               String
  requestedByUserId     String
  type                  AiAgentTaskType
  status                AiAgentTaskStatus @default(DRAFT)
  title                 String
  instruction           String
  resourceType          String?
  resourceId            String?
  priority              Int               @default(50)
  requiresApproval      Boolean           @default(true)
  policySnapshot        Json?
  contextSnapshot       Json?
  output                String?
  confidence            Int?
  executionCount        Int               @default(0)
  approvedByUserId      String?
  approvedAt            DateTime?
  startedAt             DateTime?
  completedAt           DateTime?
  failedAt              DateTime?
  failureReason         String?
  tenant                Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent                 AiAgent           @relation(fields: [agentId], references: [id], onDelete: Cascade)
  approvals             AiAgentTaskApproval[]
  attempts              AiAgentTaskAttempt[]
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@index([tenantId, status, priority, createdAt])
  @@index([agentId, status])
  @@index([resourceType, resourceId])
}

model AiAgentTaskApproval {
  id                    String                  @id @default(cuid())
  taskId                String
  approverUserId        String
  sequence              Int
  decision              AiAgentApprovalDecision @default(PENDING)
  comments              String?
  decidedAt             DateTime?
  task                  AiAgentTask             @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  @@unique([taskId, approverUserId, sequence])
  @@index([approverUserId, decision])
  @@index([taskId, sequence])
}

model AiAgentTaskAttempt {
  id                    String       @id @default(cuid())
  taskId                String
  aiExecutionId         String?
  attemptNumber         Int
  model                 String?
  status                String
  inputSnapshot         Json?
  outputSnapshot        Json?
  startedAt             DateTime     @default(now())
  completedAt           DateTime?
  errorMessage          String?
  task                  AiAgentTask  @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([taskId, attemptNumber])
  @@index([taskId, startedAt])
  @@index([aiExecutionId])
}
"""

path.write_text(schema)
print("AI agent control-plane schema applied.")

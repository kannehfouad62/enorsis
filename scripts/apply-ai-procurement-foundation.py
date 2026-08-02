from pathlib import Path
import json

schema_path = Path("prisma/schema.prisma")
schema = schema_path.read_text()

if "enum AiExecutionStatus" not in schema:
    anchor = "enum ContractAmendmentStatus {"
    enums = """enum AiExecutionStatus {
  PENDING
  COMPLETED
  FAILED
  REJECTED
}

enum AiReviewStatus {
  NOT_REQUIRED
  PENDING
  ACCEPTED
  REJECTED
}

enum AiCapability {
  PROCUREMENT_COPILOT
  RFX_DRAFT
  SUPPLIER_ANALYSIS
  CONTRACT_REVIEW
  NEGOTIATION_ADVISOR
  SPEND_ANALYSIS
  RISK_BRIEF
  EXECUTIVE_BRIEF
}

"""
    if anchor not in schema:
        raise SystemExit("Could not locate the AI enum insertion anchor.")
    schema = schema.replace(anchor, enums + anchor, 1)

if "model AiPromptTemplate {" not in schema:
    schema += r"""

model AiPromptTemplate {
  id             String       @id @default(cuid())
  tenantId       String?
  key            String
  capability     AiCapability
  name           String
  systemPrompt   String
  version        Int          @default(1)
  isActive       Boolean      @default(true)
  requiresReview Boolean      @default(true)
  createdByUserId String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([tenantId, key, version])
  @@index([tenantId, capability, isActive])
}

model AiExecution {
  id               String            @id @default(cuid())
  tenantId         String
  userId           String
  capability       AiCapability
  promptTemplateId String?
  promptVersion    Int?
  model            String
  inputText        String
  outputText       String?
  status           AiExecutionStatus @default(PENDING)
  reviewStatus     AiReviewStatus     @default(PENDING)
  confidence       Int?
  evidence         Json?
  inputTokens      Int?
  outputTokens     Int?
  totalTokens      Int?
  latencyMs        Int?
  errorMessage     String?
  resourceType     String?
  resourceId       String?
  completedAt      DateTime?
  reviewedAt       DateTime?
  reviewedByUserId String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([tenantId, capability, createdAt])
  @@index([tenantId, reviewStatus, createdAt])
  @@index([userId, createdAt])
}
"""

schema_path.write_text(schema)

package_path = Path("package.json")
package = json.loads(package_path.read_text())
dependencies = package.setdefault("dependencies", {})
dependencies.setdefault("openai", "^5.12.2")
package_path.write_text(json.dumps(package, indent=2) + "\n")

env_path = Path(".env.example")
if env_path.exists():
    env = env_path.read_text()
    additions = []
    if "OPENAI_API_KEY" not in env:
        additions.append('OPENAI_API_KEY=""')
    if "OPENAI_MODEL" not in env:
        additions.append('OPENAI_MODEL="gpt-5"')
    if additions:
        env += "\n# Governed Enorsis AI gateway.\n" + "\n".join(additions) + "\n"
        env_path.write_text(env)

print("AI procurement foundation schema and package configuration applied.")

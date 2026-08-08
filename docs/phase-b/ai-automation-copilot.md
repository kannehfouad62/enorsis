# B2.9.2.13 — AI Automation Copilot

The Automation Copilot extends the existing governed AI and enterprise
automation architecture. It does not introduce a second agent runtime.

Capabilities:
- natural-language automation intent capture
- tenant-scoped context from existing automation rules
- reuse of active automation templates
- reuse of governed connector registry metadata
- governed AI execution through the existing AI gateway
- persisted AI execution and audit history
- explainable draft workflow recommendations
- explicit human-approval boundaries
- designer build checklist and simulation guidance

Safety and governance boundaries:
- no workflow activation
- no direct procurement transaction execution
- no supplier award
- no contract execution
- no purchase-order release
- no payment release
- no bank-detail change
- no user-role change
- existing Automation Designer and Runtime remain the authoritative execution path

No Prisma migration is required. The phase reuses AiExecution,
EnterpriseAutomationRule, EnterpriseAutomationTemplate and
EnterpriseAutomationConnector.

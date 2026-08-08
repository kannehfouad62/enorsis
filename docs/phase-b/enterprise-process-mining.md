# B2.9.2.14 — Enterprise Process Mining

Enterprise Process Mining is a read-only analytics layer over the existing
Enorsis workflow execution history. It does not replace or modify the workflow
engine.

Capabilities:
- process-instance discovery from WorkflowInstance history
- actual path/variant discovery from WorkflowTask execution
- average and P90 cycle-time analytics
- workflow-step bottleneck scoring
- overdue-task analysis
- escalation analysis
- rework signals from returned/rejected workflow tasks
- workflow conformance indicators
- process-level operational performance
- direct handoff to the AI Automation Copilot for governed redesign

Governance:
- tenant scoped
- read only
- no automatic workflow changes
- no runtime mutation
- no procurement transaction mutation
- workflow redesign remains subject to Automation Designer validation and
  existing activation controls

No Prisma migration is required. The mining layer uses existing
WorkflowInstance, WorkflowTask, WorkflowStep and WorkflowDefinition data.

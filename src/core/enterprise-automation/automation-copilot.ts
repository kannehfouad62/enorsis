export type AutomationCopilotContext = {
  rules: Array<{
    name: string;
    status: string;
    description: string | null;
  }>;
  templates: Array<{
    name: string;
    category: string;
    description: string | null;
  }>;
  connectors: Array<{
    name: string;
    connectorKey: string;
    type: string;
    status: string;
    policyTag: string | null;
  }>;
};

function compact(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function buildAutomationCopilotPrompt(input: {
  intent: string;
  context: AutomationCopilotContext;
}) {
  const ruleContext =
    input.context.rules.length > 0
      ? input.context.rules
          .map(
            (rule) =>
              `- ${rule.name} [${rule.status}]: ${compact(rule.description)}`,
          )
          .join("\n")
      : "- No existing tenant automation rules were supplied.";

  const templateContext =
    input.context.templates.length > 0
      ? input.context.templates
          .map(
            (template) =>
              `- ${template.name} [${template.category}]: ${compact(template.description)}`,
          )
          .join("\n")
      : "- No automation templates were supplied.";

  const connectorContext =
    input.context.connectors.length > 0
      ? input.context.connectors
          .map(
            (connector) =>
              `- ${connector.name} (${connector.connectorKey}) ` +
              `[${connector.type}/${connector.status}] policy=${compact(connector.policyTag)}`,
          )
          .join("\n")
      : "- No governed connectors are currently available.";

  return [
    "You are operating as the Enorsis AI Automation Copilot.",
    "Create a governed draft automation design only. Do not execute, activate, publish, approve, award, release, pay, or modify any procurement transaction.",
    "",
    "USER AUTOMATION INTENT",
    input.intent,
    "",
    "CURRENT TENANT AUTOMATION RULES",
    ruleContext,
    "",
    "AVAILABLE AUTOMATION TEMPLATES",
    templateContext,
    "",
    "GOVERNED CONNECTORS",
    connectorContext,
    "",
    "Return a concise but implementation-ready draft using exactly these sections:",
    "1. Automation Objective",
    "2. Recommended Trigger",
    "3. Conditions and Decision Logic",
    "4. Proposed Actions in Execution Order",
    "5. Connector Dependencies",
    "6. Human Approval and Governance Gates",
    "7. Idempotency, Retry and Failure Controls",
    "8. Data and Security Boundaries",
    "9. Test and Simulation Scenarios",
    "10. Designer Build Checklist",
    "",
    "For every proposed action, label it as ADVISORY, DRAFT, HUMAN_APPROVAL_REQUIRED, or SYSTEM_SAFE.",
    "Call out assumptions and missing information explicitly.",
    "Reuse existing rules, templates, connectors and policy boundaries when appropriate; never invent connector availability.",
    "Any supplier award, contract execution, purchase-order release, payment release, bank-detail change, or user-role change must remain human-approved.",
  ].join("\n");
}

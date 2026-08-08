from pathlib import Path
import re

path = Path(
    "src/core/enterprise-automation/connectors/executor.ts"
)

if not path.exists():
    raise SystemExit(
        "Connector executor file was not found."
    )

content = path.read_text()

if "enforceAutomationConnectorPolicy" in content:
    print(
        "Connector observability integration already applied."
    )
    raise SystemExit(0)

# ---------------------------------------------------------
# 1. Add policy/audit imports
# ---------------------------------------------------------

registry_import_pattern = re.compile(
    r'import\s*\{\s*'
    r'recordAutomationConnectorUsage,\s*'
    r'resolveAutomationConnectorConfiguration,\s*'
    r'\}\s*from\s*"./registry-service";',
    re.MULTILINE,
)

match = registry_import_pattern.search(content)

if not match:
    raise SystemExit(
        "Could not locate registry-service imports."
    )

replacement = (
    match.group(0)
    + '\nimport { enforceAutomationConnectorPolicy } '
      'from "./policy";'
    + '\nimport { recordAutomationConnectorAudit } '
      'from "./audit-service";'
)

content = (
    content[:match.start()]
    + replacement
    + content[match.end():]
)

# ---------------------------------------------------------
# 2. Insert policy enforcement after connector resolution
# ---------------------------------------------------------

resolution_pattern = re.compile(
    r'(governedConnectorId\s*=\s*'
    r'resolved\.connector\.id\s*;)',
    re.MULTILINE,
)

match = resolution_pattern.search(content)

if not match:
    raise SystemExit(
        "Could not locate governedConnectorId assignment."
    )

policy_block = r'''

    try {
      await enforceAutomationConnectorPolicy({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
      });
    } catch (error) {
      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type: "POLICY_BLOCKED",
        actionId: action.id,
        message:
          error instanceof Error
            ? error.message
            : "Connector policy blocked execution.",
      });

      throw error;
    }
'''

content = (
    content[:match.end()]
    + policy_block
    + content[match.end():]
)

# ---------------------------------------------------------
# 3. Add successful execution metrics/audit
# ---------------------------------------------------------

usage_pattern = re.compile(
    r'if\s*\(\s*governedConnectorId\s*\)\s*\{\s*'
    r'await\s+recordAutomationConnectorUsage\s*\(\s*'
    r'governedConnectorId\s*,?\s*\)\s*;\s*'
    r'\}',
    re.MULTILINE,
)

match = usage_pattern.search(content)

if not match:
    raise SystemExit(
        "Could not locate governed connector usage block."
    )

success_block = r'''if (governedConnectorId) {
      await recordAutomationConnectorUsage(
        governedConnectorId,
      );

      await prisma.enterpriseAutomationConnector.update({
        where: {
          id: governedConnectorId,
        },
        data: {
          successCount: {
            increment: 1,
          },
          consecutiveFailures: 0,
        },
      });

      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type: "EXECUTED",
        actionId: action.id,
        message:
          "Connector action executed successfully.",
      });
    }'''

content = (
    content[:match.start()]
    + success_block
    + content[match.end():]
)

# ---------------------------------------------------------
# 4. Add failure metrics inside existing catch block
# ---------------------------------------------------------

catch_pattern = re.compile(
    r'(\}\s*catch\s*\(\s*error\s*\)\s*\{\s*'
    r'const\s+message\s*=\s*'
    r'error\s+instanceof\s+Error\s*'
    r'\?\s*error\.message\s*'
    r':\s*"Unknown connector execution failure\.";\s*)',
    re.MULTILINE,
)

match = catch_pattern.search(content)

if not match:
    raise SystemExit(
        "Could not locate connector execution catch block."
    )

failure_block = r'''

    if (governedConnectorId) {
      await prisma.enterpriseAutomationConnector.update({
        where: {
          id: governedConnectorId,
        },
        data: {
          failureCount: {
            increment: 1,
          },
          consecutiveFailures: {
            increment: 1,
          },
          lastFailureAt: new Date(),
          lastFailureMessage: message,
        },
      });

      await recordAutomationConnectorAudit({
        tenantId: action.tenantId,
        connectorId: governedConnectorId,
        type: "EXECUTION_FAILED",
        actionId: action.id,
        message,
      });
    }
'''

content = (
    content[:match.end()]
    + failure_block
    + content[match.end():]
)

path.write_text(content)

print(
    "Connector observability and policy "
    "integration applied."
)

from pathlib import Path

path = Path("src/core/enterprise-automation/connectors/executor.ts")
content = path.read_text()

if "resolveAutomationConnectorConfiguration" in content:
    print("Connector executor already uses governed registry.")
    raise SystemExit(0)

import_anchor = 'import {\n  resolveAutomationConnectorAdapter,\n} from "./registry";'
import_replacement = import_anchor + '\nimport {\n  recordAutomationConnectorUsage,\n  resolveAutomationConnectorConfiguration,\n} from "./registry-service";'

if import_anchor not in content:
    raise SystemExit("Could not locate connector registry import anchor.")

content = content.replace(import_anchor, import_replacement, 1)

config_anchor = '  const configuration =\n    request.configuration &&\n    typeof request.configuration === "object" &&\n    !Array.isArray(request.configuration)\n      ? (request.configuration as Record<\n          string,\n          unknown\n        >)\n      : {};\n'

if config_anchor not in content:
    raise SystemExit("Could not locate connector executor configuration anchor.")

config_replacement = config_anchor + '\n  const connectorKey =\n    typeof configuration.connectorKey === "string"\n      ? configuration.connectorKey\n      : null;\n\n  let governedConfiguration = configuration;\n  let governedConnectorId: string | null = null;\n\n  if (connectorKey) {\n    const resolved =\n      await resolveAutomationConnectorConfiguration({\n        tenantId: action.tenantId,\n        connectorKey,\n      });\n\n    governedConnectorId = resolved.connector.id;\n\n    governedConfiguration = {\n      ...configuration,\n      connector: resolved.configuration,\n    };\n  }\n'

content = content.replace(config_anchor, config_replacement, 1)

execute_anchor = '      configuration,\n      input: request.input,\n    });'
execute_replacement = '      configuration:\n        governedConfiguration,\n      input: request.input,\n    });\n\n    if (governedConnectorId) {\n      await recordAutomationConnectorUsage(\n        governedConnectorId,\n      );\n    }'

if execute_anchor not in content:
    raise SystemExit("Could not locate connector adapter execute anchor.")

content = content.replace(execute_anchor, execute_replacement, 1)

path.write_text(content)
print("Connector executor now resolves governed connectorKey records.")

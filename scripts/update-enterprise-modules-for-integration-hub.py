from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/integration-hub"' in content:
    print("Integration Hub & Connector Framework is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Integration Hub & Connector Framework",
    description: "Connector catalog, credentials, mappings and sync operations.",
    href: "/app/settings/integration-hub",
    icon: PlugZap,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Integration Hub & Connector Framework to the Enterprise Modules directory.")

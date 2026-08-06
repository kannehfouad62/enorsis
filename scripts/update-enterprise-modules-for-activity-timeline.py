from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/activity"' in content:
    print("Universal Activity Timeline is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Universal Activity Timeline",
    description: "Tenant-safe business activity, audit context and traceability.",
    href: "/app/settings/activity",
    icon: History,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Universal Activity Timeline to the Enterprise Modules directory.")

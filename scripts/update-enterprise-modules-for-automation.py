from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/automation"' in content:
    print("Enterprise Workflow Automation is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Enterprise Workflow Automation",
    description: "Governed event, schedule and condition-based enterprise automation.",
    href: "/app/automation",
    icon: BadgeCheck,
    group: "Governance",
  },
"""

anchor=content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor]+"\n"+entry+content[anchor:])
print("Added Enterprise Workflow Automation to the Enterprise Modules directory.")

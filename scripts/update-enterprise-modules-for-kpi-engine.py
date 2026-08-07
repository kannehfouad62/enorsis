from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/kpis"' in content:
    print("Enterprise KPI Engine is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Enterprise KPI Engine",
    description: "Targets, thresholds, trends and executive health scoring.",
    href: "/app/executive/kpis",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Enterprise KPI Engine to the Enterprise Modules directory.")

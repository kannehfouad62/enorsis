from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/analytics-foundation"' in content:
    print("Analytics Foundation is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Analytics Foundation",
    description: "Governed KPI registry, snapshots and aggregation runs.",
    href: "/app/executive/analytics-foundation",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Analytics Foundation to the Enterprise Modules directory.")

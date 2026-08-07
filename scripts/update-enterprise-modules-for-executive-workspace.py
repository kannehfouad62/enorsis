from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive"' in content:
    print("Executive Intelligence Workspace is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Executive Intelligence",
    description: "Enterprise health, KPI cockpit and operational risk.",
    href: "/app/executive",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Executive Intelligence Workspace to the Enterprise Modules directory.")

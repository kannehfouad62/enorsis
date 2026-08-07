from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/replenishment"' in content:
    print("Replenishment is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Replenishment & Transfers",
    description: "Min/max planning, replenishment and stock transfers.",
    href: "/app/replenishment",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Replenishment & Transfers to the Enterprise Modules directory.")

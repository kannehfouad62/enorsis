from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/warehouse-intelligence"' in content:
    print("Warehouse Intelligence is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Warehouse Intelligence",
    description: "Receiving, putaway, picking, utilization and warehouse health.",
    href: "/app/executive/warehouse-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Warehouse Intelligence to the Enterprise Modules directory.")

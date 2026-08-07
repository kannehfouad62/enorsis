from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/warehouse-operations"' in content:
    print("Warehouse Operations is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Warehouse Operations",
    description: "Receiving, putaway, location capacity and discrepancies.",
    href: "/app/warehouse-operations",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Warehouse Operations to the Enterprise Modules directory.")

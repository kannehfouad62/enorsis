from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/inventory-traceability"' in content:
    print("Inventory Traceability is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Inventory Traceability",
    description: "Lot, serial, expiry, quarantine and recall traceability.",
    href: "/app/inventory-traceability",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Inventory Traceability to the Enterprise Modules directory.")

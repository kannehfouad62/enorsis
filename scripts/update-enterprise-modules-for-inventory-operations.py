from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/inventory-operations"' in content:
    print("Inventory Operations is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Inventory Operations",
    description: "Movement ledger, availability, reservations and exceptions.",
    href: "/app/inventory-operations",
    icon: BadgeCheck,
    group: "Inventory",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Inventory Operations to the Enterprise Modules directory.")

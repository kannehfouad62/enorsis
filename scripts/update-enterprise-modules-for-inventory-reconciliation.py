from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/inventory-reconciliation"' in content:
    print("Inventory Reconciliation is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Inventory Reconciliation",
    description: "Cycle counts, reconciliation and stock adjustments.",
    href: "/app/inventory-reconciliation",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Inventory Reconciliation to the Enterprise Modules directory.")

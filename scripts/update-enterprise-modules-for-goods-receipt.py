from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/receipts"' in content:
    print("Goods Receipt is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Goods Receipt",
    description: "Receipt posting, quantity tolerances, damage and exceptions.",
    href: "/app/requisition-to-order/receipts",
    icon: PackageCheck,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Goods Receipt to the Enterprise Modules directory.")

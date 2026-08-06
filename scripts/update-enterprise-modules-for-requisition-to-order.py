from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order"' in content:
    print("Requisition-to-Order is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Requisition-to-Order",
    description: "Requisition, approval, order, receipt and exception journey.",
    href: "/app/requisition-to-order",
    icon: ShoppingCart,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Requisition-to-Order to the Enterprise Modules directory.")

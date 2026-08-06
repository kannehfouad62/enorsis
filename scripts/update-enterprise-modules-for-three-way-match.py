from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/three-way-match"' in content:
    print("Three-Way Match is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Three-Way Match",
    description: "PO, receipt and supplier-invoice reconciliation.",
    href: "/app/requisition-to-order/three-way-match",
    icon: Scale,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Three-Way Match to the Enterprise Modules directory.")

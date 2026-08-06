from pathlib import Path

path = Path('src/modules/navigation/enterprise-modules.ts')
content = path.read_text()

if 'href: "/app/requisition-to-order/purchase-orders"' in content:
    print('Purchase Order Execution is already present.')
    raise SystemExit(0)

entry = '''  {
    title: "Purchase Order Execution",
    description: "PO generation, validation, issue, acknowledgment and revisions.",
    href: "/app/requisition-to-order/purchase-orders",
    icon: FileCheck2,
    group: "Procurement",
  },
'''

anchor = content.rfind('\n];')
if anchor == -1:
    raise SystemExit('Could not locate enterprise modules array end.')

path.write_text(content[:anchor] + '\n' + entry + content[anchor:])
print('Added Purchase Order Execution to the Enterprise Modules directory.')

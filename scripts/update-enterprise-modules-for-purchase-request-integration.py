from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/purchase-request"' in content:
    print("Purchase Request Integration is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Purchase Request Integration",
    description: "Submission readiness, request evidence and governed handoff to approval.",
    href: "/app/requisition-to-order/purchase-request",
    icon: ClipboardCheck,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Purchase Request Integration to the Enterprise Modules directory.")

from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/payment-readiness"' in content:
    print("Payment Readiness is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Payment Readiness",
    description: "AP controls, payment holds, approvals and batch eligibility.",
    href: "/app/requisition-to-order/payment-readiness",
    icon: CircleDollarSign,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Payment Readiness to the Enterprise Modules directory.")

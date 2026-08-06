from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/analytics"' in content:
    print("Procurement Analytics is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Procurement Analytics",
    description: "Executive KPIs, bottlenecks, exceptions and payment readiness.",
    href: "/app/requisition-to-order/analytics",
    icon: BadgeCheck,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Procurement Analytics to the Enterprise Modules directory.")

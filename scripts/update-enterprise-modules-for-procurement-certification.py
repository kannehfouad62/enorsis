from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/requisition-to-order/certification"' in content:
    print("Procurement Process Certification is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Procurement Certification",
    description: "End-to-end process certification and closure controls.",
    href: "/app/requisition-to-order/certification",
    icon: BadgeCheck,
    group: "Procurement",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Procurement Process Certification to the Enterprise Modules directory.")

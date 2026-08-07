from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/procurement-intelligence"' in content:
    print("Procurement Intelligence is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Procurement Intelligence",
    description: "Spend, approvals, contracts, savings and procurement health.",
    href: "/app/executive/procurement-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Procurement Intelligence to the Enterprise Modules directory.")

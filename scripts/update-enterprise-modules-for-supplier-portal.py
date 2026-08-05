from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/supplier-portal"' in content:
    print("Supplier Portal & Onboarding is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Supplier Portal & Onboarding",
    description: "Supplier access, questionnaires, tasks and collaboration.",
    href: "/app/supplier-portal",
    icon: Users,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate the end of the enterprise modules array.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Supplier Portal & Onboarding to the Enterprise Modules directory.")

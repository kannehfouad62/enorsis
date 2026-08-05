from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")

if not path.exists():
    raise SystemExit(
        "Could not locate src/modules/navigation/enterprise-modules.ts."
    )

content = path.read_text()

if 'href: "/app/supplier-portal"' in content:
    print("Supplier Portal & Onboarding is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Supplier Portal & Onboarding",
    description: "Supplier access, questionnaires, tasks and collaboration.",
    href: "/app/supplier-portal",
    icon: Users,
    group: "Procurement",
  },
'''

array_end = content.rfind("\n];")

if array_end == -1:
    raise SystemExit(
        "Could not locate the end of the enterprise modules array."
    )

updated = content[:array_end] + "\n" + entry + content[array_end:]
path.write_text(updated)

print(
    "Added Supplier Portal & Onboarding "
    "to the Enterprise Modules directory."
)

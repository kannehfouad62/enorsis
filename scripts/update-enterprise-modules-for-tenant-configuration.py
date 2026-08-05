from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/configuration"' in content:
    print("Tenant Enterprise Configuration is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Tenant Enterprise Configuration",
    description: "Branding, locale, security, residency and operational limits.",
    href: "/app/settings/configuration",
    icon: Settings2,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Tenant Enterprise Configuration to the Enterprise Modules directory.")

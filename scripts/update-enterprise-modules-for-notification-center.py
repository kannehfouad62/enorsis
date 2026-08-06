from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/notifications"' in content:
    print("Unified Notification Center is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Unified Notification Center",
    description: "Templates, preferences, channels and delivery operations.",
    href: "/app/settings/notifications",
    icon: Bell,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Unified Notification Center to the Enterprise Modules directory.")

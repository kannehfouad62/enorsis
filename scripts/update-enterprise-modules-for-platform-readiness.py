from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/platform-readiness"' in content:
    print("Platform Readiness is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Platform Readiness",
    description: "Release checks, evidence, blockers and certification history.",
    href: "/app/settings/platform-readiness",
    icon: BadgeCheck,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Platform Readiness to the Enterprise Modules directory.")

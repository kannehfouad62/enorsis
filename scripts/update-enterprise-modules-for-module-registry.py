from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/modules"' in content:
    print("Module Registry is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Module Registry",
    description: "Central module metadata, licensing and capability catalog.",
    href: "/app/settings/modules",
    icon: Boxes,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit(
        "Could not locate the end of the enterprise modules array."
    )

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Module Registry to the Enterprise Modules directory.")

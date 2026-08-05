from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/jobs"' in content:
    print("Background Job Platform is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Background Job Platform",
    description: "Schedules, retries, executions and worker operations.",
    href: "/app/settings/jobs",
    icon: Workflow,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Background Job Platform to the Enterprise Modules directory.")

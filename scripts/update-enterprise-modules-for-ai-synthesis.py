from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/ai-synthesis"' in content:
    print("OpenAI Executive Synthesis is already present.")
    raise SystemExit(0)

entry = """  {
    title: "OpenAI Executive Synthesis",
    description: "Governed board-ready synthesis from approved enterprise evidence.",
    href: "/app/executive/ai-synthesis",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added OpenAI Executive Synthesis to the Enterprise Modules directory.")

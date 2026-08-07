from pathlib import Path

path = Path("src/app/app/executive/ai-intelligence/page.tsx")
content = path.read_text()

import_line = (
    'import { CrossDomainInsightActions } '
    'from "./cross-domain-actions";\n'
)

if import_line not in content:
    marker = 'import { getGovernedExecutiveAiWorkspace }'
    index = content.find(marker)
    if index == -1:
        raise SystemExit("Could not locate AI workspace import anchor.")
    line_start = content.rfind("\n", 0, index) + 1
    content = content[:line_start] + import_line + content[line_start:]

button_anchor = """        <form action={runGovernedExecutiveInsightEngineAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Run insight engine
          </button>
        </form>"""

replacement = """        <div className="flex flex-wrap gap-3">
          <form action={runGovernedExecutiveInsightEngineAction}>
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Run insight engine
            </button>
          </form>
          <CrossDomainInsightActions />
        </div>"""

if "Run cross-domain correlation" not in content:
    if button_anchor not in content:
        raise SystemExit("Could not locate insight-engine button anchor.")
    content = content.replace(button_anchor, replacement, 1)

path.write_text(content)
print("Updated AI Intelligence workspace for cross-domain correlation.")

from pathlib import Path

types = Path('src/core/enterprise-automation/graph-types.ts')
canvas = Path('src/components/automation/workflow-canvas.tsx')
inspector = Path('src/components/automation/workflow-inspector.tsx')
validation = Path('src/core/enterprise-automation/graph-validation.ts')

for path in [types, canvas, inspector, validation]:
    if not path.exists():
        raise SystemExit(f'Missing required file: {path}')

content = types.read_text()
if '| "JOIN"' not in content:
    content = content.replace('  | "PARALLEL"\n', '  | "PARALLEL"\n  | "JOIN"\n', 1)
    types.write_text(content)

content = canvas.read_text()
if '{ type: "JOIN", label: "Join" }' not in content:
    content = content.replace(
        '  { type: "PARALLEL", label: "Parallel" },',
        '  { type: "PARALLEL", label: "Parallel" },\n  { type: "JOIN", label: "Join" },',
        1,
    )
    canvas.write_text(content)

content = inspector.read_text()
if 'node.type === "JOIN"' not in content:
    marker = '''        {node.type === "PARALLEL" ? (\n          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">\n            Connect this node to at least two branches.\n          </p>\n        ) : null}\n'''
    replacement = marker + '''\n        {node.type === "JOIN" ? (\n          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">\n            Join waits until all directly connected incoming branches\n            have completed before continuing.\n          </p>\n        ) : null}\n'''
    if marker not in content:
        raise SystemExit('Could not locate Parallel inspector anchor.')
    inspector.write_text(content.replace(marker, replacement, 1))

content = validation.read_text()
if 'JOIN_INCOMING_COUNT' not in content:
    marker = '''    if (node.type === "PARALLEL" && outgoing.length < 2) {\n      issues.push({\n        severity: "ERROR",\n        code: "PARALLEL_BRANCH_COUNT",\n        message:\n          "Parallel node requires at least two outgoing branches.",\n        nodeId: node.id,\n      });\n    }\n'''
    replacement = marker + '''\n    if (\n      node.type === "JOIN" &&\n      (incoming.get(node.id) ?? 0) < 2\n    ) {\n      issues.push({\n        severity: "ERROR",\n        code: "JOIN_INCOMING_COUNT",\n        message:\n          "Join node requires at least two incoming branches.",\n        nodeId: node.id,\n      });\n    }\n'''
    if marker not in content:
        raise SystemExit('Could not locate parallel validation anchor.')
    validation.write_text(content.replace(marker, replacement, 1))

print('Added governed JOIN node to visual workflow canvas.')

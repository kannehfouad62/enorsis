from pathlib import Path

path = Path('src/app/app/automation/runtime/page.tsx')
content = path.read_text()

if 'recoverDurableAutomationExecutionAction' in content:
    print('Durable runtime recovery UI is already present.')
    raise SystemExit(0)

content = content.replace(
    'import { getDurableAutomationRuntimeWorkspace } from "@/modules/enterprise-automation/runtime-queries";',
    'import { getDurableAutomationRuntimeWorkspace } from "@/modules/enterprise-automation/runtime-queries";\n'
    'import { recoverDurableAutomationExecutionAction } from "@/modules/enterprise-automation/recovery-actions";',
    1,
)

anchor = '              {waiting.map((node) =>\n'
recovery = '''              {execution.status === "FAILED" ? (\n                <div className="mt-5 rounded-2xl bg-red-50 p-4">\n                  <p className="font-black text-red-800">\n                    Execution recovery\n                  </p>\n                  <p className="mt-1 text-xs text-red-700">\n                    Requeue the most recent failed checkpoint and\n                    resume this execution.\n                  </p>\n                  <form\n                    action={recoverDurableAutomationExecutionAction}\n                    className="mt-3"\n                  >\n                    <input\n                      type="hidden"\n                      name="executionId"\n                      value={execution.id}\n                    />\n                    <button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white">\n                      Recover execution\n                    </button>\n                  </form>\n                </div>\n              ) : null}\n\n'''
if anchor not in content:
    raise SystemExit('Could not locate waiting-node UI anchor.')
path.write_text(content.replace(anchor, recovery + anchor, 1))
print('Added durable runtime recovery controls.')

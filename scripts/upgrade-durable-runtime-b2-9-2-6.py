from pathlib import Path

path = Path('src/core/enterprise-automation/durable-runtime.ts')
content = path.read_text()

if 'isDurableJoinReady' in content:
    print('B2.9.2.6 durable runtime integration already applied.')
    raise SystemExit(0)

content = content.replace(
    'import { compileAutomationRuntimePlan } from "./runtime-plan";',
    'import { compileAutomationRuntimePlan } from "./runtime-plan";\n'
    'import {\n'
    '  durableRetryPolicy,\n'
    '  retryDelayForAttempt,\n'
    '  timeoutAtForNode,\n'
    '} from "./durable-runtime-policy";\n'
    'import { isDurableJoinReady } from "./durable-join";',
    1,
)

start_anchor = '''    await prisma.enterpriseAutomationRuntimeNode.update({\n      where: { id: checkpoint.id },\n      data: {\n        status: "RUNNING",\n        attemptCount: { increment: 1 },\n        startedAt: checkpoint.startedAt ?? new Date(),\n      },\n    });\n'''
replacement = '''    const nodeStartedAt =\n      checkpoint.startedAt ?? new Date();\n\n    await prisma.enterpriseAutomationRuntimeNode.update({\n      where: { id: checkpoint.id },\n      data: {\n        status: "RUNNING",\n        attemptCount: { increment: 1 },\n        startedAt: nodeStartedAt,\n        timeoutAt: timeoutAtForNode(node, nodeStartedAt),\n      },\n    });\n'''
if start_anchor not in content:
    raise SystemExit('Could not locate runtime node start anchor.')
content = content.replace(start_anchor, replacement, 1)

wake_anchor = '''  await prisma.enterpriseAutomationRuntimeNode.updateMany({\n    where: {\n      executionId: execution.id,\n      status: "WAITING",\n      availableAt: { lte: now },\n      waitReason: "TIME",\n    },\n    data: {\n      status: "READY",\n      waitReason: null,\n    },\n  });\n'''
wake_replacement = '''  await prisma.enterpriseAutomationRuntimeNode.updateMany({\n    where: {\n      executionId: execution.id,\n      status: "WAITING",\n      availableAt: { lte: now },\n      waitReason: { in: ["TIME", "RETRY"] },\n    },\n    data: {\n      status: "READY",\n      waitReason: null,\n    },\n  });\n'''
if wake_anchor not in content:
    raise SystemExit('Could not locate wake-up anchor.')
content = content.replace(wake_anchor, wake_replacement, 1)

approval_anchor = '    if (node.type === "APPROVAL") {\n'
join_block = '''    if (node.type === "JOIN") {\n      const join = await isDurableJoinReady({\n        executionId: execution.id,\n        graph,\n        joinNodeId: node.id,\n      });\n\n      if (!join.ready) {\n        await prisma.enterpriseAutomationRuntimeNode.update({\n          where: { id: checkpoint.id },\n          data: {\n            status: "WAITING",\n            waitReason: "PARALLEL_JOIN",\n            result: toJson({\n              missingIncomingNodeIds: join.missing,\n            }),\n          },\n        });\n        break;\n      }\n    }\n\n'''
if approval_anchor not in content:
    raise SystemExit('Could not locate approval anchor.')
content = content.replace(approval_anchor, join_block + approval_anchor, 1)

# Clear timeout when a checkpoint completes.
complete_anchor = '''        status: "COMPLETED",\n        completedAt: new Date(),\n        result: toJson({\n'''
complete_replacement = '''        status: "COMPLETED",\n        completedAt: new Date(),\n        timeoutAt: null,\n        result: toJson({\n'''
if complete_anchor not in content:
    raise SystemExit('Could not locate completion anchor.')
content = content.replace(complete_anchor, complete_replacement, 1)

content = content.replace(
    '  signalType: "APPROVAL" | "RESUME" | "CANCEL";',
    '  signalType:\n    | "APPROVAL"\n    | "RESUME"\n    | "RETRY"\n    | "RECOVER"\n    | "CANCEL";',
    1,
)

path.write_text(content)
print('B2.9.2.6 durable runtime integration applied.')

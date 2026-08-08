from pathlib import Path

path = Path("src/core/enterprise-automation/durable-runtime.ts")

if not path.exists():
    raise SystemExit(
        "src/core/enterprise-automation/durable-runtime.ts was not found."
    )

content = path.read_text()

import_line = (
    'import { dispatchDurableAutomationAction } '
    'from "./runtime-action-dispatch";'
)

if import_line not in content:
    anchor = 'import { isDurableJoinReady } from "./durable-join";'

    if anchor not in content:
        anchor = 'import { compileAutomationRuntimePlan } from "./runtime-plan";'

    if anchor not in content:
        raise SystemExit(
            "Could not locate a durable-runtime import anchor."
        )

    content = content.replace(
        anchor,
        anchor + "\n" + import_line,
        1,
    )

action_marker = 'if (node.type === "ACTION") {'

start = content.find(action_marker)

if start < 0:
    raise SystemExit(
        'Could not locate if (node.type === "ACTION") block.'
    )

brace_start = content.find("{", start)

if brace_start < 0:
    raise SystemExit("Could not locate ACTION opening brace.")

depth = 0
end = None

for index in range(brace_start, len(content)):
    char = content[index]

    if char == "{":
        depth += 1

    elif char == "}":
        depth -= 1

        if depth == 0:
            end = index + 1
            break

if end is None:
    raise SystemExit("Could not locate ACTION closing brace.")

replacement = '''if (node.type === "ACTION") {
      const existingAction =
        await prisma.enterpriseAutomationRuntimeAction.findFirst({
          where: {
            runtimeNodeId: checkpoint.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (existingAction?.status === "COMPLETED") {
        // The external action already completed.
        // Continue through the graph without dispatching it again.
      } else if (
        existingAction &&
        ["DISPATCHED", "ACKNOWLEDGED"].includes(
          existingAction.status,
        )
      ) {
        await prisma.enterpriseAutomationRuntimeNode.update({
          where: {
            id: checkpoint.id,
          },
          data: {
            status: "WAITING",
            waitReason: "ACTION_CALLBACK",
          },
        });

        await prisma.enterpriseAutomationRuntimeExecution.update({
          where: {
            id: execution.id,
          },
          data: {
            status: "WAITING",
            wakeAt: null,
          },
        });

        break;
      } else {
        const retryPolicy = durableRetryPolicy(node);

        const nextAttempt =
          checkpoint.attemptCount + 1;

        if (
          checkpoint.lastError &&
          nextAttempt < retryPolicy.maxAttempts
        ) {
          const delayMinutes =
            retryDelayForAttempt(
              retryPolicy,
              nextAttempt,
            );

          const availableAt =
            delayMinutes > 0
              ? new Date(
                  Date.now() +
                    delayMinutes * 60_000,
                )
              : new Date();

          await prisma.enterpriseAutomationRuntimeNode.update({
            where: {
              id: checkpoint.id,
            },
            data: {
              status: "WAITING",
              waitReason: "RETRY",
              availableAt,
              retryDelayMinutes:
                delayMinutes,
            },
          });

          await prisma.enterpriseAutomationRuntimeExecution.update({
            where: {
              id: execution.id,
            },
            data: {
              status: "WAITING",
              wakeAt: availableAt,
            },
          });

          break;
        }

        const dispatch =
          await dispatchDurableAutomationAction({
            tenantId: input.tenantId,
            executionId: execution.id,
            runtimeNodeId: checkpoint.id,
            node,
            executionInput:
              execution.input,
          });

        if (
          dispatch.action.status !==
          "COMPLETED"
        ) {
          await prisma.enterpriseAutomationRuntimeNode.update({
            where: {
              id: checkpoint.id,
            },
            data: {
              status: "WAITING",
              waitReason:
                "ACTION_CALLBACK",
              result: toJson({
                actionId:
                  dispatch.action.id,
                idempotencyKey:
                  dispatch.action
                    .idempotencyKey,
                duplicateSuppressed:
                  dispatch
                    .duplicateSuppressed,
              }),
            },
          });

          await prisma.enterpriseAutomationRuntimeExecution.update({
            where: {
              id: execution.id,
            },
            data: {
              status: "WAITING",
              wakeAt: null,
            },
          });

          break;
        }
      }
    }'''

content = (
    content[:start]
    + replacement
    + content[end:]
)

path.write_text(content)

print(
    "B2.9.2.7 durable action acknowledgement "
    "integration applied."
)

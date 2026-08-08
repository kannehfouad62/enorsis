from pathlib import Path

query_path = Path(
    "src/modules/enterprise-automation/runtime-queries.ts"
)

page_path = Path(
    "src/app/app/automation/runtime/page.tsx"
)

if not query_path.exists():
    raise SystemExit(
        "src/modules/enterprise-automation/runtime-queries.ts was not found."
    )

if not page_path.exists():
    raise SystemExit(
        "src/app/app/automation/runtime/page.tsx was not found."
    )

query = query_path.read_text()

if "actions:" not in query:
    marker = """        signals: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
"""

    replacement = marker + """        actions: {
          include: {
            callbacks: {
              orderBy: {
                receivedAt: "desc",
              },
              take: 5,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
"""

    if marker not in query:
        raise SystemExit(
            "Could not locate signals include block "
            "in runtime-queries.ts."
        )

    query = query.replace(
        marker,
        replacement,
        1,
    )

    query_path.write_text(query)

page = page_path.read_text()

if "Durable actions" not in page:
    marker = """              {execution.status === "FAILED" ? (
"""

    block = """              {execution.actions.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Durable actions
                  </p>

                  <div className="mt-3 space-y-2">
                    {execution.actions.map((action) => (
                      <div
                        key={action.id}
                        className="rounded-xl bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black">
                            {action.actionType}
                          </p>

                          <span>
                            {action.status}
                          </span>
                        </div>

                        <p className="mt-1 text-slate-500">
                          Dispatches:{" "}
                          {action.dispatchCount}
                          {" · "}
                          callbacks:{" "}
                          {action.callbacks.length}
                        </p>

                        <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                          {action.idempotencyKey}
                        </p>

                        {action.externalReference ? (
                          <p className="mt-1 text-slate-500">
                            External reference:{" "}
                            {action.externalReference}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

"""

    if marker not in page:
        raise SystemExit(
            "Could not locate failed-execution "
            "UI anchor in runtime page."
        )

    page = page.replace(
        marker,
        block + marker,
        1,
    )

    page_path.write_text(page)

print(
    "Added durable action status "
    "to runtime workspace."
)

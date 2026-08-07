from pathlib import Path

path = Path("src/app/app/executive/board-reporting/page.tsx")
content = path.read_text()

if "Export PDF" in content:
    print("Board Reporting workspace already contains export controls.")
    raise SystemExit(0)

anchor = """            {pack.status === "GENERATED" ? (
              <form
                action={finalizeExecutiveBoardPackAction}
                className="mt-5"
              >
                <input type="hidden" name="packId" value={pack.id} />
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                  Finalize board pack
                </button>
              </form>
            ) : null}"""

replacement = """            <div className="mt-5 flex flex-wrap gap-3">
              {(["pdf", "docx", "xlsx", "pptx"] as const).map((format) => (
                <a
                  key={format}
                  href={`/api/executive/board-packs/${pack.id}/export/${format}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black"
                >
                  Export {format.toUpperCase()}
                </a>
              ))}

              {pack.status === "GENERATED" ? (
                <form action={finalizeExecutiveBoardPackAction}>
                  <input type="hidden" name="packId" value={pack.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Finalize board pack
                  </button>
                </form>
              ) : null}
            </div>"""

if anchor not in content:
    raise SystemExit("Could not locate board-pack finalize anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added PDF, Word, Excel and PowerPoint exports to Board Reporting.")

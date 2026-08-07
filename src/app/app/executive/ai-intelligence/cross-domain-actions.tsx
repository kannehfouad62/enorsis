import { runCrossDomainExecutiveInsightEngineAction } from "@/modules/governed-executive-ai/correlated-actions";

export function CrossDomainInsightActions() {
  return (
    <form action={runCrossDomainExecutiveInsightEngineAction}>
      <button className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white">
        Run cross-domain correlation
      </button>
    </form>
  );
}

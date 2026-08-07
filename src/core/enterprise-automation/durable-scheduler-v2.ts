import { failTimedOutDurableAutomationNodes } from "./durable-timeout";
import { runDueDurableAutomationExecutions } from "./durable-scheduler";

export async function runDurableAutomationRecoveryCycle() {
  const timeoutResult = await failTimedOutDurableAutomationNodes();
  const resumeResult = await runDueDurableAutomationExecutions();

  return {
    timedOut: timeoutResult.timedOut,
    processed: resumeResult.processed,
    results: resumeResult.results,
  };
}

import {
  runDurableAutomationRecoveryCycle,
} from "../durable-scheduler-v2";
import {
  runPendingAutomationActions,
} from "./executor";

export async function runEnterpriseAutomationConnectorCycle() {
  const runtime =
    await runDurableAutomationRecoveryCycle();

  const actions =
    await runPendingAutomationActions();

  return {
    runtime,
    actions,
  };
}

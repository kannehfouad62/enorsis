import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getAutomationConnectorMetrics,
} from "@/core/enterprise-automation/connectors/metrics";

export async function getConnectorObservabilityWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return {
    connectors:
      await getAutomationConnectorMetrics(
        session.user.tenantId,
      ),
  };
}

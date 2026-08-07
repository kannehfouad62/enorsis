import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getExecutiveDecisionBriefing } from "@/core/governed-executive-ai/briefing";

export async function getExecutiveDecisionBriefingWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return getExecutiveDecisionBriefing(session.user.tenantId);
}

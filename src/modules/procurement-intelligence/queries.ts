import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { calculateProcurementIntelligence } from "@/core/procurement-intelligence/service";

export async function getProcurementIntelligenceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return calculateProcurementIntelligence(session.user.tenantId);
}

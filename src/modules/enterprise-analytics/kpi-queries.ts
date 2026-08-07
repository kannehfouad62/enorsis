import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getEnterpriseKpiCards,
  getEnterpriseKpiExecutiveScore,
} from "@/core/enterprise-analytics/kpi-engine";

export async function getEnterpriseKpiWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [cards, score] = await Promise.all([
    getEnterpriseKpiCards({ tenantId }),
    getEnterpriseKpiExecutiveScore(tenantId),
  ]);

  return {
    cards,
    score,
  };
}

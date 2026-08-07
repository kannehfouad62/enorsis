import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { calculateWarehouseIntelligence } from "@/core/warehouse-intelligence/service";

export async function getWarehouseIntelligenceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return calculateWarehouseIntelligence(session.user.tenantId);
}

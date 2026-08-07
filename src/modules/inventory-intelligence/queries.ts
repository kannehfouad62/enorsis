import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { calculateInventoryIntelligence } from "@/core/inventory-intelligence/service";

export async function getInventoryIntelligenceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return calculateInventoryIntelligence(session.user.tenantId);
}

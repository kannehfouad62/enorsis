"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  reconcileClosedLoopOutcome,
  reconcileClosedLoopOutcomes,
} from "@/core/closed-loop-procurement/native-reconciliation";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function reconcileClosedLoopOutcomesAction() {
  await requireAnyRole([...roles]);

  await reconcileClosedLoopOutcomes();

  revalidatePath(
    "/app/analytics/outcome-learning",
  );
  revalidatePath(
    "/app/analytics/outcome-learning/reconciliation",
  );
}

export async function reconcileClosedLoopOutcomeAction(
  data: FormData,
) {
  await requireAnyRole([...roles]);

  await reconcileClosedLoopOutcome(
    field(data, "outcomeId"),
  );

  revalidatePath(
    "/app/analytics/outcome-learning",
  );
  revalidatePath(
    "/app/analytics/outcome-learning/reconciliation",
  );
}

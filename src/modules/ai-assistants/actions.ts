"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  isProcurementAssistantKey,
  procurementAssistants,
} from "@/core/ai/assistants/assistant-config";
import { runSpecializedAssistant } from "@/core/ai/assistants/orchestrator";

const allAssistantRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "FINANCE",
  "AUDITOR",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function askSpecializedAssistantAction(
  data: FormData,
) {
  const user = await requireAnyRole([...allAssistantRoles]);
  const assistant = field(data, "assistant");
  const question = field(data, "question");

  if (!isProcurementAssistantKey(assistant)) {
    throw new Error("Unsupported procurement assistant.");
  }

  if (
    !procurementAssistants[assistant].roles.some((role) =>
      user.roles.includes(role),
    )
  ) {
    throw new Error(
      "Your role is not authorized to use this assistant.",
    );
  }

  if (question.length < 10 || question.length > 8000) {
    throw new Error(
      "Question must contain between 10 and 8,000 characters.",
    );
  }

  await runSpecializedAssistant({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email ?? "unknown@enorsis.local",
    assistant,
    question,
  });

  revalidatePath("/app/ai/assistants");
}

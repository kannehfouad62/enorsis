"use server";

import { revalidatePath } from "next/cache";
import { executeGovernedAi } from "@/core/ai/gateway";
import {
  buildGroundedProcurementPrompt,
  retrieveProcurementKnowledge,
} from "@/core/ai/rag/procurement-retrieval";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "FINANCE",
  "AUDITOR",
] as const;

export async function askUnifiedProcurementAiAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const question = String(data.get("question") ?? "").trim();

  if (question.length < 10 || question.length > 8000) {
    throw new Error(
      "Question must contain between 10 and 8,000 characters.",
    );
  }

  const sources = await retrieveProcurementKnowledge({
    tenantId: user.tenantId,
    question,
    limit: 12,
  });

  const execution = await executeGovernedAi({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email ?? "unknown@enorsis.local",
    capability: "PROCUREMENT_COPILOT",
    input: buildGroundedProcurementPrompt({
      question,
      sources,
    }),
    resourceType: "EnterpriseRagCopilot",
  });

  await prisma.aiExecution.update({
    where: { id: execution.id },
    data: {
      evidence: {
        source: "tenant_retrieval",
        grounded: true,
        sourceCount: sources.length,
        sources: sources.map((source) => ({
          type: source.type,
          id: source.id,
          title: source.title,
          reference: source.reference,
          score: source.score,
        })),
        limitations: [
          "This retrieval foundation searches structured Enorsis tenant records.",
          "Private supplier-file content is not yet extracted or embedded in B4.1.",
          "Human review is required before controlled procurement actions.",
        ],
      },
    },
  });

  revalidatePath("/app/ai/workspace");
}

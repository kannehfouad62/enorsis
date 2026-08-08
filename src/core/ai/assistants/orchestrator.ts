import { executeGovernedAi } from "@/core/ai/gateway";
import {
  semanticSearchEnterpriseKnowledge,
} from "@/core/ai/rag/knowledge-index";
import {
  procurementAssistants,
  type ProcurementAssistantKey,
} from "./assistant-config";
import { prisma } from "@/lib/prisma";

function formatEvidence(
  matches: Awaited<
    ReturnType<typeof semanticSearchEnterpriseKnowledge>
  >,
) {
  if (matches.length === 0) {
    return "No Enterprise RAG knowledge chunks matched this request.";
  }

  return matches
    .map(
      (match, index) =>
        `[${index + 1}] ${match.sourceType} | ${match.title} | ` +
        `${match.reference} | similarity=${match.score.toFixed(4)}\n` +
        match.content,
    )
    .join("\n\n");
}

export async function runSpecializedAssistant(input: {
  tenantId: string;
  userId: string;
  userEmail: string;
  assistant: ProcurementAssistantKey;
  question: string;
}) {
  const definition = procurementAssistants[input.assistant];

  const matches = await semanticSearchEnterpriseKnowledge({
    tenantId: input.tenantId,
    query: input.question,
    limit: 12,
  });

  const execution = await executeGovernedAi({
    tenantId: input.tenantId,
    userId: input.userId,
    userEmail: input.userEmail,
    capability: definition.capability,
    resourceType: `ProcurementAssistant:${definition.key}`,
    input: [
      `You are operating as the Enorsis ${definition.name}.`,
      definition.description,
      definition.evidenceGuidance,
      "",
      "Grounding requirements:",
      "- Use retrieved tenant evidence for tenant-specific facts.",
      "- Cite retrieved evidence using [1], [2], etc.",
      "- Never invent company policy, supplier facts, contract terms, approvals, inventory quantities or executive decisions.",
      "- If evidence is missing or incomplete, state the limitation.",
      "- Do not execute purchases, awards, payments, contract commitments or access changes.",
      "- Controlled procurement actions require human approval.",
      "",
      "USER QUESTION",
      input.question,
      "",
      "RETRIEVED ENTERPRISE EVIDENCE",
      formatEvidence(matches),
      "",
      "RESPONSE STRUCTURE",
      ...definition.outputGuidance.map(
        (item, index) => `${index + 1}. ${item}`,
      ),
    ].join("\n"),
  });

  await prisma.aiExecution.update({
    where: { id: execution.id },
    data: {
      evidence: {
        source: "specialized_enterprise_rag",
        grounded: true,
        assistant: definition.key,
        assistantName: definition.name,
        sourceCount: matches.length,
        sources: matches.map((match) => ({
          sourceId: match.sourceId,
          chunkId: match.chunkId,
          type: match.sourceType,
          title: match.title,
          reference: match.reference,
          similarity: match.score,
        })),
        limitations: [
          "Responses depend on the quality and coverage of tenant knowledge indexed in Enterprise RAG.",
          "The assistant does not execute controlled procurement actions.",
          "Human approval remains mandatory where policy or workflow requires it.",
        ],
      },
    },
  });

  return execution;
}

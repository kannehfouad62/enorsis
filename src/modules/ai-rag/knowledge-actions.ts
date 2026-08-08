"use server";

import { revalidatePath } from "next/cache";
import { executeGovernedAi } from "@/core/ai/gateway";
import {
  indexEnterpriseKnowledgeSource,
  semanticSearchEnterpriseKnowledge,
} from "@/core/ai/rag/knowledge-index";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const knowledgeRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
] as const;

const askRoles = [
  ...knowledgeRoles,
  "BUYER",
  "SUPPLIER_MANAGER",
  "FINANCE",
  "AUDITOR",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createKnowledgeSourceAction(
  data: FormData,
) {
  const user = await requireAnyRole([...knowledgeRoles]);

  const title = field(data, "title");
  const sourceType = field(data, "sourceType");
  const description = field(data, "description") || null;
  const externalReference =
    field(data, "externalReference") || null;
  const content = field(data, "content");

  if (title.length < 3) {
    throw new Error("Knowledge source title is required.");
  }

  if (content.length < 50 || content.length > 250_000) {
    throw new Error(
      "Knowledge content must contain between 50 and 250,000 characters.",
    );
  }

  const source = await prisma.enterpriseKnowledgeSource.create({
    data: {
      tenantId: user.tenantId,
      sourceType,
      title,
      description,
      externalReference,
      status: "INDEXING",
      createdByUserId: user.id,
    },
  });

  try {
    await indexEnterpriseKnowledgeSource({
      sourceId: source.id,
      tenantId: user.tenantId,
      content,
    });
  } catch (error) {
    await prisma.enterpriseKnowledgeSource.update({
      where: { id: source.id },
      data: {
        status: "FAILED",
        metadata: {
          error:
            error instanceof Error
              ? error.message
              : "Unknown indexing error",
        },
      },
    });
    throw error;
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Knowledge administrator",
      action: "knowledge_source.index",
      resourceType: "EnterpriseKnowledgeSource",
      resourceId: source.id,
      after: {
        sourceType,
        title,
        externalReference,
      },
    },
  });

  revalidatePath("/app/ai/knowledge");
}

export async function setKnowledgeSourceStatusAction(
  data: FormData,
) {
  const user = await requireAnyRole([...knowledgeRoles]);
  const sourceId = field(data, "sourceId");
  const status = field(data, "status");

  if (!["ACTIVE", "DISABLED"].includes(status)) {
    throw new Error("Unsupported knowledge-source status.");
  }

  const result = await prisma.enterpriseKnowledgeSource.updateMany({
    where: {
      id: sourceId,
      tenantId: user.tenantId,
    },
    data: { status },
  });

  if (result.count !== 1) {
    throw new Error("Knowledge source was not found.");
  }

  revalidatePath("/app/ai/knowledge");
}

export async function askSemanticKnowledgeAction(
  data: FormData,
) {
  const user = await requireAnyRole([...askRoles]);
  const question = field(data, "question");

  if (question.length < 10 || question.length > 8000) {
    throw new Error(
      "Question must contain between 10 and 8,000 characters.",
    );
  }

  const matches = await semanticSearchEnterpriseKnowledge({
    tenantId: user.tenantId,
    query: question,
    limit: 10,
  });

  const evidence =
    matches.length === 0
      ? "No semantic knowledge chunks matched this question."
      : matches
          .map(
            (match, index) =>
              `[${index + 1}] ${match.sourceType} | ` +
              `${match.title} | ${match.reference} | ` +
              `similarity=${match.score.toFixed(4)}\n` +
              match.content,
          )
          .join("\n\n");

  const execution = await executeGovernedAi({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email ?? "unknown@enorsis.local",
    capability: "PROCUREMENT_COPILOT",
    resourceType: "EnterpriseSemanticRag",
    input: [
      "Answer the procurement question using the retrieved tenant knowledge below.",
      "Cite retrieved evidence using [1], [2], etc.",
      "Do not invent policy, supplier, contract, procedure or company facts.",
      "If evidence is insufficient, state that clearly.",
      "Controlled procurement decisions remain subject to human approval.",
      "",
      "QUESTION",
      question,
      "",
      "SEMANTICALLY RETRIEVED EVIDENCE",
      evidence,
    ].join("\n"),
  });

  await prisma.aiExecution.update({
    where: { id: execution.id },
    data: {
      evidence: {
        source: "enterprise_semantic_rag",
        grounded: true,
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
          "Only ACTIVE indexed Enorsis knowledge sources are searched.",
          "Controlled procurement actions require human approval.",
        ],
      },
    },
  });

  revalidatePath("/app/ai/knowledge");
}

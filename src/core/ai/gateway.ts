import { performance } from "node:perf_hooks";
import type { AiCapability } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getDefaultAiModel, getOpenAiClient } from "./client";
import { platformPrompts } from "./prompts";

export interface GovernedAiRequest {
  tenantId: string;
  userId: string;
  userEmail: string;
  capability: AiCapability;
  input: string;
  resourceType?: string;
  resourceId?: string;
}

function estimateConfidence(output: string) {
  if (!output.trim()) return 0;
  const uncertaintySignals = [
    "insufficient information",
    "cannot determine",
    "unclear",
    "unknown",
    "not provided",
  ];
  const penalties = uncertaintySignals.filter((signal) =>
    output.toLowerCase().includes(signal),
  ).length;
  return Math.max(45, 88 - penalties * 8);
}

export async function executeGovernedAi(request: GovernedAiRequest) {
  const prompt = platformPrompts[request.capability];
  const model = getDefaultAiModel();

  const template = await prisma.aiPromptTemplate.findFirst({
    where: {
      OR: [{ tenantId: request.tenantId }, { tenantId: null }],
      key: prompt.key,
      isActive: true,
    },
    orderBy: [{ tenantId: "desc" }, { version: "desc" }],
  });

  const execution = await prisma.aiExecution.create({
    data: {
      tenantId: request.tenantId,
      userId: request.userId,
      capability: request.capability,
      promptTemplateId: template?.id ?? null,
      promptVersion: template?.version ?? 1,
      model,
      inputText: request.input,
      status: "PENDING",
      reviewStatus:
        template?.requiresReview ?? prompt.requiresReview
          ? "PENDING"
          : "NOT_REQUIRED",
      resourceType: request.resourceType ?? null,
      resourceId: request.resourceId ?? null,
    },
  });

  const startedAt = performance.now();

  try {
    const client = getOpenAiClient();
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "developer",
          content: template?.systemPrompt ?? prompt.systemPrompt,
        },
        {
          role: "user",
          content:
            `Tenant context: ${request.tenantId}\n` +
            `User: ${request.userEmail}\n\n` +
            request.input,
        },
      ],
    });

    const output = response.output_text.trim();
    const confidence = estimateConfidence(output);
    const usage = response.usage;

    const completed = await prisma.aiExecution.update({
      where: { id: execution.id },
      data: {
        outputText: output,
        status: "COMPLETED",
        confidence,
        evidence: {
          source: "user_and_tenant_context",
          limitations: [
            "The model can only use the information supplied in this request.",
            "Human review is required before operational use.",
          ],
        },
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
        latencyMs: Math.round(performance.now() - startedAt),
        completedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: request.tenantId,
        userId: request.userId,
        actorType: "AI_AGENT",
        actorId: execution.id,
        actorLabel: `${prompt.name} · ${model}`,
        action: "ai_execution.complete",
        resourceType: request.resourceType ?? "AiExecution",
        resourceId: request.resourceId ?? execution.id,
        after: {
          capability: request.capability,
          confidence,
          model,
          promptVersion: template?.version ?? 1,
        },
      },
    });

    return completed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI execution error.";

    await prisma.aiExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        latencyMs: Math.round(performance.now() - startedAt),
        completedAt: new Date(),
      },
    });

    throw new Error(`Enorsis AI request failed: ${message}`);
  }
}

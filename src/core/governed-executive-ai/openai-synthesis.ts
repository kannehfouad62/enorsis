import crypto from "node:crypto";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";

const PROMPT_VERSION = "B2.8.5.5-v1";
const DEFAULT_MODEL = process.env.OPENAI_EXECUTIVE_MODEL ?? "gpt-5";

type SynthesisPayload = {
  title: string;
  executiveSummary: string;
  keyRisks: Array<{
    title: string;
    whyItMatters: string;
    evidenceInsightIds: string[];
  }>;
  keyOpportunities: Array<{
    title: string;
    whyItMatters: string;
    evidenceInsightIds: string[];
  }>;
  recommendedPriorities: Array<{
    priority: string;
    rationale: string;
    requiresHumanApproval: boolean;
    evidenceInsightIds: string[];
  }>;
  governanceNotes: Array<{
    note: string;
    evidenceInsightIds: string[];
  }>;
  confidenceStatement: string;
};

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function fingerprint(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function parseJson(text: string): SynthesisPayload {
  const parsed = JSON.parse(text) as SynthesisPayload;

  if (
    !parsed.title ||
    !parsed.executiveSummary ||
    !Array.isArray(parsed.keyRisks) ||
    !Array.isArray(parsed.keyOpportunities) ||
    !Array.isArray(parsed.recommendedPriorities) ||
    !Array.isArray(parsed.governanceNotes) ||
    !parsed.confidenceStatement
  ) {
    throw new Error("OpenAI synthesis response did not match the required schema.");
  }

  return parsed;
}

export async function runOpenAiExecutiveSynthesis(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const insights = await prisma.governedExecutiveInsight.findMany({
    where: {
      tenantId: input.tenantId,
      status: {
        in: ["PUBLISHED", "ACKNOWLEDGED"],
      },
    },
    include: {
      evidence: true,
      approval: true,
    },
    orderBy: [
      { requiresHumanReview: "desc" },
      { createdAt: "desc" },
    ],
    take: 40,
  });

  if (insights.length === 0) {
    throw new Error(
      "No governed executive insights are available for synthesis.",
    );
  }

  const source = insights.map((insight) => ({
    id: insight.id,
    type: insight.type,
    severity: insight.severity,
    domain: insight.domain,
    category: insight.category,
    title: insight.title,
    executiveSummary: insight.executiveSummary,
    explanation: insight.explanation,
    recommendation: insight.recommendation,
    confidenceScore: Number(insight.confidenceScore),
    requiresHumanReview: insight.requiresHumanReview,
    approvalStatus: insight.approval?.status ?? null,
    evidence: insight.evidence.map((item) => ({
      label: item.label,
      observedValue: item.observedValue,
      expectedValue: item.expectedValue,
      metricKey: item.metricKey,
    })),
  }));

  const inputFingerprint = fingerprint(source);

  const count = await prisma.executiveSynthesisRun.count({
    where: { tenantId: input.tenantId },
  });

  const run = await prisma.executiveSynthesisRun.create({
    data: {
      tenantId: input.tenantId,
      runNumber: `SYN-${new Date().getFullYear()}-${String(
        count + 1,
      ).padStart(7, "0")}`,
      status: "PENDING",
      provider: "OPENAI",
      model: DEFAULT_MODEL,
      sourceInsightCount: source.length,
      startedAt: new Date(),
      initiatedByUserId: input.actorUserId,
      promptVersion: PROMPT_VERSION,
      inputFingerprint,
    },
  });

  try {
    const openai = client();

    const response = await openai.responses.create({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are the governed executive synthesis layer for Enorsis. " +
            "Use only the evidence provided. Do not invent facts, metrics, causes, " +
            "suppliers, financial values, dates, or operational events. " +
            "Do not approve, reject, escalate, dismiss, or execute recommendations. " +
            "Treat human approval status as authoritative. " +
            "Return valid JSON only with keys: title, executiveSummary, keyRisks, " +
            "keyOpportunities, recommendedPriorities, governanceNotes, confidenceStatement. " +
            "Each risk/opportunity/priority/governance item must include evidenceInsightIds " +
            "that exactly match source insight IDs.",
        },
        {
          role: "user",
          content: JSON.stringify({
            purpose:
              "Create a concise board-ready executive synthesis from governed Enorsis insights.",
            rules: {
              evidenceOnly: true,
              noAutonomousDecisions: true,
              preserveHumanApprovalAuthority: true,
              doNotInferMissingData: true,
            },
            insights: source,
          }),
        },
      ],
    });

    const outputText = response.output_text?.trim();

    if (!outputText) {
      throw new Error("OpenAI returned an empty synthesis response.");
    }

    const synthesis = parseJson(outputText);

    const validInsightIds = new Set(source.map((item) => item.id));

    const assertIds = (ids: string[]) => {
      for (const id of ids) {
        if (!validInsightIds.has(id)) {
          throw new Error(
            `OpenAI synthesis referenced unknown insight ID: ${id}`,
          );
        }
      }
    };

    for (const item of synthesis.keyRisks) assertIds(item.evidenceInsightIds);
    for (const item of synthesis.keyOpportunities)
      assertIds(item.evidenceInsightIds);
    for (const item of synthesis.recommendedPriorities)
      assertIds(item.evidenceInsightIds);
    for (const item of synthesis.governanceNotes)
      assertIds(item.evidenceInsightIds);

    const stored = await prisma.executiveSynthesis.create({
      data: {
        tenantId: input.tenantId,
        synthesisRunId: run.id,
        title: synthesis.title,
        executiveSummary: synthesis.executiveSummary,
        keyRisks: toJson(synthesis.keyRisks),
        keyOpportunities: toJson(synthesis.keyOpportunities),
        recommendedPriorities: toJson(synthesis.recommendedPriorities),
        governanceNotes: toJson(synthesis.governanceNotes),
        confidenceStatement: synthesis.confidenceStatement,
        sourceInsightIds: toJson(source.map((item) => item.id)),
      },
    });

    await prisma.executiveSynthesisRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        responseId: response.id ?? null,
        summary: toJson({
          synthesisId: stored.id,
          sourceInsightCount: source.length,
          promptVersion: PROMPT_VERSION,
        }),
      },
    });

    await publishDomainEvent({
      tenantId: input.tenantId,
      eventType: "GovernedExecutiveAI.SynthesisCompleted",
      aggregateType: "ExecutiveSynthesis",
      aggregateId: stored.id,
      sourceModule: "governed-executive-ai",
      actorUserId: input.actorUserId,
      payload: {
        synthesisId: stored.id,
        synthesisRunId: run.id,
        model: DEFAULT_MODEL,
        sourceInsightCount: source.length,
      },
    });

    await recordEnterpriseActivity({
      tenantId: input.tenantId,
      activityType: "GovernedExecutiveAI.SynthesisCompleted",
      sourceModule: "governed-executive-ai",
      title: "OpenAI executive synthesis completed",
      description: run.runNumber,
      severity: "SUCCESS",
      actorUserId: input.actorUserId,
      subjectType: "ExecutiveSynthesis",
      subjectId: stored.id,
      subjectLabel: synthesis.title,
      actionUrl: "/app/executive/ai-synthesis",
    });

    return stored;
  } catch (error) {
    await prisma.executiveSynthesisRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown OpenAI executive synthesis error.",
      },
    });

    throw error;
  }
}

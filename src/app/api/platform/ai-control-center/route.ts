import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateAiRuntimeHealth } from "@/core/ai-monitoring/runtime-health";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenantId = session.user.tenantId;

  const [
    health,
    certification,
    adoptions,
    activePolicyCount,
    openConflictCount,
  ] = await Promise.all([
    calculateAiRuntimeHealth(tenantId),
    prisma.aiRuntimeCertificationRun.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.closedLoopRuntimePolicyAdoption.findMany({
      where: { tenantId },
      select: {
        decisionPath: true,
        mode: true,
        decisionCount: true,
        shadowDifferenceCount: true,
      },
      orderBy: { decisionPath: "asc" },
    }),
    prisma.closedLoopLearningPolicy.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),
    prisma.crossEngineGovernanceConflict.count({
      where: {
        tenantId,
        status: "OPEN",
      },
    }),
  ]);

  return NextResponse.json({
    health,
    certification: certification
      ? {
          id: certification.id,
          status: certification.status,
          score:
            certification.certificationScore,
          completedAt:
            certification.completedAt,
        }
      : null,
    adoptions,
    activePolicyCount,
    openConflictCount,
    providers: {
      openAiConfigured:
        Boolean(process.env.OPENAI_API_KEY),
      azureOpenAiConfigured:
        Boolean(
          process.env.AZURE_OPENAI_API_KEY &&
            process.env.AZURE_OPENAI_ENDPOINT,
        ),
      anthropicConfigured:
        Boolean(process.env.ANTHROPIC_API_KEY),
      googleConfigured:
        Boolean(
          process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        ),
    },
  });
}

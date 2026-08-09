import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateAiRuntimeHealth } from "@/core/ai-monitoring/runtime-health";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

function providerStatus() {
  const openAiConfigured =
    Boolean(process.env.OPENAI_API_KEY);

  const azureOpenAiConfigured =
    Boolean(
      process.env.AZURE_OPENAI_API_KEY &&
        process.env.AZURE_OPENAI_ENDPOINT,
    );

  const anthropicConfigured =
    Boolean(process.env.ANTHROPIC_API_KEY);

  const googleConfigured =
    Boolean(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    );

  const providers = [
    {
      key: "OPENAI",
      label: "OpenAI",
      configured: openAiConfigured,
      mode: openAiConfigured
        ? "AVAILABLE"
        : "NOT_CONFIGURED",
    },
    {
      key: "AZURE_OPENAI",
      label: "Azure OpenAI",
      configured: azureOpenAiConfigured,
      mode: azureOpenAiConfigured
        ? "AVAILABLE"
        : "NOT_CONFIGURED",
    },
    {
      key: "ANTHROPIC",
      label: "Anthropic",
      configured: anthropicConfigured,
      mode: anthropicConfigured
        ? "AVAILABLE"
        : "NOT_CONFIGURED",
    },
    {
      key: "GOOGLE",
      label: "Google Generative AI",
      configured: googleConfigured,
      mode: googleConfigured
        ? "AVAILABLE"
        : "NOT_CONFIGURED",
    },
  ];

  return {
    providers,
    configuredCount: providers.filter(
      (provider) => provider.configured,
    ).length,
  };
}

export async function getEnterpriseAiControlCenter() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      roles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [
    health,
    latestCertification,
    adoptions,
    activePolicies,
    latestPromotionAssessment,
    latestCrossEngineAssessment,
    openCrossEngineConflicts,
    latestHealthSnapshot,
    latestRuntimeTraces,
  ] = await Promise.all([
    calculateAiRuntimeHealth(tenantId),
    prisma.aiRuntimeCertificationRun.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.closedLoopRuntimePolicyAdoption.findMany({
      where: { tenantId },
      orderBy: { decisionPath: "asc" },
    }),
    prisma.closedLoopLearningPolicy.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      orderBy: [
        { policyKey: "asc" },
        { version: "desc" },
      ],
      take: 200,
    }),
    prisma.closedLoopRuntimePromotionAssessment.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crossEngineGovernanceAssessment.findFirst({
      where: { tenantId },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.crossEngineGovernanceConflict.count({
      where: {
        tenantId,
        status: "OPEN",
      },
    }),
    prisma.aiRuntimeHealthSnapshot.findFirst({
      where: { tenantId },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const provider = providerStatus();

  const runtimeSupportedPolicies =
    activePolicies.filter(
      (policy) =>
        policy.policyType ===
        "CONFIDENCE_THRESHOLD",
    );

  const enforcedEngines = adoptions.filter(
    (adoption) =>
      adoption.mode === "ENFORCED",
  );

  const shadowEngines = adoptions.filter(
    (adoption) =>
      adoption.mode === "SHADOW",
  );

  const offEngines = adoptions.filter(
    (adoption) =>
      adoption.mode === "OFF",
  );

  const governanceReady =
    latestCertification?.status === "PASSED" &&
    health.status === "HEALTHY" &&
    openCrossEngineConflicts === 0;

  return {
    health,
    latestCertification,
    adoptions,
    activePolicies,
    latestPromotionAssessment,
    latestCrossEngineAssessment,
    openCrossEngineConflicts,
    latestHealthSnapshot,
    latestRuntimeTraces,
    providers: provider.providers,
    summary: {
      configuredProviders:
        provider.configuredCount,
      activePolicies:
        activePolicies.length,
      runtimeSupportedPolicies:
        runtimeSupportedPolicies.length,
      enforcedEngines:
        enforcedEngines.length,
      shadowEngines:
        shadowEngines.length,
      offEngines:
        offEngines.length,
      governanceReady,
    },
  };
}

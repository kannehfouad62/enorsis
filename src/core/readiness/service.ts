import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { readinessChecks } from "./checks";
import { rc1ReadinessChecks } from "./rc1-checks";
import type { ReadinessCheckResult } from "./types";

export async function runPlatformCertification({
  tenantId,
  name,
  releaseVersion,
  environment,
  userId,
}: {
  tenantId?: string | null;
  name: string;
  releaseVersion?: string | null;
  environment?: string;
  userId?: string | null;
}) {
  const run = await prisma.platformCertificationRun.create({
    data: {
      tenantId: tenantId ?? null,
      name,
      releaseVersion: releaseVersion ?? null,
      environment:
        environment ??
        process.env.VERCEL_ENV ??
        "LOCAL",
      status: "RUNNING",
      startedAt: new Date(),
      initiatedByUserId: userId ?? null,
    },
  });

  const results: ReadinessCheckResult[] = [];

  for (const check of [
    ...readinessChecks,
    ...rc1ReadinessChecks,
  ]) {
    try {
      const result = await check();
      results.push(result);
    } catch (error) {
      const failedResult: ReadinessCheckResult = {
        key: `unexpected.${results.length + 1}`,
        category: "Platform",
        name: "Unexpected readiness-check failure",
        description:
          "A readiness check threw an unexpected exception.",
        status: "FAIL",
        severity: "CRITICAL",
        releaseBlocking: true,
        observedValue: "EXCEPTION",
        expectedValue: "PASS",
        evidence: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown check error.",
        },
        remediation:
          "Inspect the readiness service and rerun certification.",
        durationMs: 0,
      };

      results.push(failedResult);
    }
  }

  await prisma.platformReadinessCheck.createMany({
    data: results.map((result) => ({
      certificationRunId: run.id,
      key: result.key,
      category: result.category,
      name: result.name,
      description: result.description ?? null,
      status: result.status,
      severity: result.severity,
      releaseBlocking:
        result.releaseBlocking ?? false,
      observedValue: result.observedValue ?? null,
      expectedValue: result.expectedValue ?? null,
      evidence: toJson(result.evidence ?? {}),
      remediation: result.remediation ?? null,
      durationMs: result.durationMs ?? null,
    })),
  });

  const failed = results.filter(
    (item) => item.status === "FAIL",
  );

  const warnings = results.filter(
    (item) => item.status === "WARN",
  );

  const releaseBlocked = failed.some(
    (item) => item.releaseBlocking === true,
  );

  const status:
    | "FAILED"
    | "PASSED_WITH_WARNINGS"
    | "PASSED" = releaseBlocked
    ? "FAILED"
    : warnings.length > 0 || failed.length > 0
      ? "PASSED_WITH_WARNINGS"
      : "PASSED";

  return prisma.platformCertificationRun.update({
    where: {
      id: run.id,
    },
    data: {
      status,
      completedAt: new Date(),
      releaseBlocked,
      summary: toJson({
        total: results.length,
        passed: results.filter(
          (item) => item.status === "PASS",
        ).length,
        warnings: warnings.length,
        failed: failed.length,
      }),
    },
    include: {
      checks: {
        orderBy: [
          {
            category: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
    },
  });
}

export async function certifyPlatformRelease({
  certificationRunId,
  userId,
}: {
  certificationRunId: string;
  userId: string;
}) {
  const run =
    await prisma.platformCertificationRun.findUniqueOrThrow({
      where: {
        id: certificationRunId,
      },
    });

  if (
    run.releaseBlocked ||
    run.status === "FAILED"
  ) {
    throw new Error(
      "Release certification is blocked by critical findings.",
    );
  }

  return prisma.platformCertificationRun.update({
    where: {
      id: certificationRunId,
    },
    data: {
      certifiedByUserId: userId,
      certifiedAt: new Date(),
    },
  });
}
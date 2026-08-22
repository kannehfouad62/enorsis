import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";

const MAX_RESPONSE_TEXT = 50_000;

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((item) => Number.isNaN(item))) {
    return false;
  }

  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export async function assertSafeOutboundUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV === "development" && url.protocol === "http:")
  ) {
    throw new Error("Outbound integrations require HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("Credentials must not be embedded in integration URLs.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local integration destinations are not permitted.");
  }

  const records = await lookup(hostname, { all: true, verbatim: true });

  if (records.length === 0) {
    throw new Error("The integration destination did not resolve.");
  }

  for (const record of records) {
    const version = isIP(record.address);
    const privateAddress =
      version === 4
        ? isPrivateIpv4(record.address)
        : version === 6
          ? isPrivateIpv6(record.address)
          : true;

    if (privateAddress) {
      throw new Error(
        "The integration destination resolves to a private or restricted network.",
      );
    }
  }

  return url;
}

export function resolveIntegrationSecret(reference: string | null) {
  if (!reference) return null;

  const name = reference.startsWith("env:")
    ? reference.slice(4)
    : reference;

  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    throw new Error(
      "Secret references must use an uppercase environment-variable name.",
    );
  }

  const secret = process.env[name];
  if (!secret) {
    throw new Error(`Integration secret ${name} is not configured.`);
  }

  return secret;
}

function retryDelayMs(attemptCount: number) {
  const base = 60_000;
  return Math.min(base * 2 ** Math.max(attemptCount - 1, 0), 60 * 60_000);
}

async function readResponse(response: Response) {
  const text = (await response.text()).slice(0, MAX_RESPONSE_TEXT);
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  return { raw: text };
}

export async function deliverIntegrationJob(jobId: string) {
  const job = await prisma.integrationJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { integration: true },
  });

  if (
    !["QUEUED", "RUNNING"].includes(job.status) ||
    !job.integration.outboundEnabled ||
    job.integration.status !== "ACTIVE"
  ) {
    return { processed: false, status: job.status };
  }

  const attemptCount = job.attemptCount + 1;

  await prisma.integrationJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      attemptCount,
      startedAt: new Date(),
      errorMessage: null,
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    job.integration.timeoutSeconds * 1000,
  );

  try {
    if (!job.integration.baseUrl) {
      throw new Error("The integration has no outbound base URL.");
    }

    const destination = await assertSafeOutboundUrl(
      job.integration.baseUrl,
    );
    const secret = resolveIntegrationSecret(job.integration.secretReference);

    const response = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        "X-Enorsis-Correlation-Id":
          job.correlationId ?? job.id,
        "X-Enorsis-Resource-Type":
          job.resourceType ?? "unknown",
      },
      body: JSON.stringify(job.payload),
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    const responseBody = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        `Destination returned HTTP ${response.status}: ${JSON.stringify(responseBody).slice(0, 2_000)}`,
      );
    }

    await prisma.$transaction([
      prisma.integrationJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          response: responseBody,
          completedAt: new Date(),
          nextAttemptAt: null,
        },
      }),
      prisma.integrationConnection.update({
        where: { id: job.integrationId },
        data: {
          lastSuccessfulAt: new Date(),
          lastError: null,
        },
      }),
      prisma.auditEvent.create({
        data: {
          tenantId: job.integration.tenantId,
          userId: job.createdByUserId,
          actorType: "SYSTEM",
          actorId: "integration-worker",
          actorLabel: "Enorsis Integration Worker",
          action: "integration_job.succeed",
          resourceType: "IntegrationJob",
          resourceId: job.id,
          after: {
            integrationId: job.integrationId,
            attemptCount,
            correlationId: job.correlationId,
          },
        },
      }),
    ]);

    return { processed: true, status: "SUCCEEDED" as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown delivery failure.";
    const exhausted = attemptCount >= job.integration.retryLimit;
    const status = exhausted ? "DEAD_LETTER" : "FAILED";
    const nextAttemptAt = exhausted
      ? null
      : new Date(Date.now() + retryDelayMs(attemptCount));

    await prisma.$transaction([
      prisma.integrationJob.update({
        where: { id: job.id },
        data: {
          status,
          errorMessage: message,
          completedAt: new Date(),
          nextAttemptAt,
        },
      }),
      prisma.integrationConnection.update({
        where: { id: job.integrationId },
        data: {
          status: exhausted ? "ERROR" : undefined,
          lastFailedAt: new Date(),
          lastError: message,
        },
      }),
      prisma.auditEvent.create({
        data: {
          tenantId: job.integration.tenantId,
          userId: job.createdByUserId,
          actorType: "SYSTEM",
          actorId: "integration-worker",
          actorLabel: "Enorsis Integration Worker",
          action: exhausted
            ? "integration_job.dead_letter"
            : "integration_job.fail",
          resourceType: "IntegrationJob",
          resourceId: job.id,
          after: {
            integrationId: job.integrationId,
            attemptCount,
            error: message,
            nextAttemptAt,
          },
        },
      }),
    ]);

    return { processed: true, status, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function processIntegrationQueue(limit = 10) {
  const now = new Date();

  const jobs = await prisma.integrationJob.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED"] },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: now } },
      ],
      integration: {
        status: "ACTIVE",
        outboundEnabled: true,
      },
    },
    orderBy: [
      { nextAttemptAt: "asc" },
      { createdAt: "asc" },
    ],
    take: Math.max(1, Math.min(limit, 25)),
    select: { id: true },
  });

  const results = [];

  for (const job of jobs) {
    const claimed = await prisma.integrationJob.updateMany({
      where: {
        id: job.id,
        status: { in: ["QUEUED", "FAILED"] },
      },
      data: { status: "RUNNING" },
    });

    if (claimed.count === 1) {
      results.push(await deliverIntegrationJob(job.id));
    }
  }

  return {
    selected: jobs.length,
    results,
  };
}

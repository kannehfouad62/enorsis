import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiGatewayError,
  authenticateApiRequest,
  type ApiIdentity,
} from "./authenticate";
import { enforceApiRateLimit } from "./rate-limit";

export async function withApiGateway<T>({
  request,
  scope,
  handler,
}: {
  request: Request;
  scope: string;
  handler: (identity: ApiIdentity) => Promise<T>;
}) {
  const started = Date.now();
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();
  let identity: ApiIdentity | null = null;

  try {
    identity = await authenticateApiRequest(request, scope);
    await enforceApiRateLimit(identity);

    const result = await handler(identity);
    const durationMs = Date.now() - started;

    await logRequest({
      identity,
      request,
      requestId,
      scope,
      outcome: "ALLOWED",
      statusCode: 200,
      durationMs,
    });

    return NextResponse.json(result, {
      headers: {
        "X-Request-Id": requestId,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const durationMs = Date.now() - started;
    const gatewayError =
      error instanceof ApiGatewayError
        ? error
        : new ApiGatewayError(500, "INTERNAL_ERROR");

    await logRequest({
      identity,
      request,
      requestId,
      scope,
      outcome:
        gatewayError.statusCode === 429
          ? "RATE_LIMITED"
          : gatewayError.statusCode >= 500
            ? "ERROR"
            : "DENIED",
      statusCode: gatewayError.statusCode,
      durationMs,
      errorCode: gatewayError.code,
    });

    return NextResponse.json(
      {
        error: {
          code: gatewayError.code,
          requestId,
        },
      },
      {
        status: gatewayError.statusCode,
        headers: {
          "X-Request-Id": requestId,
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}

async function logRequest({
  identity,
  request,
  requestId,
  scope,
  outcome,
  statusCode,
  durationMs,
  errorCode,
}: {
  identity: ApiIdentity | null;
  request: Request;
  requestId: string;
  scope: string;
  outcome: "ALLOWED" | "DENIED" | "RATE_LIMITED" | "ERROR";
  statusCode: number;
  durationMs: number;
  errorCode?: string;
}) {
  await prisma.apiRequestLog.create({
    data: {
      apiClientId: identity?.apiClientId,
      credentialId: identity?.credentialId,
      tenantId: identity?.tenantId,
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      scope,
      outcome,
      statusCode,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
      durationMs,
      errorCode,
    },
  });
}

import "server-only";

import { headers } from "next/headers";

export type AuditRequestContext = {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function getAuditRequestContext(): Promise<AuditRequestContext> {
  const requestHeaders = await headers();

  const forwardedFor =
    requestHeaders.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    undefined;

  const userAgent =
    requestHeaders.get("user-agent") || undefined;

  const requestId =
    requestHeaders.get("x-request-id") ||
    requestHeaders.get("x-vercel-id") ||
    requestHeaders.get("cf-ray") ||
    undefined;

  return {
    requestId,
    ipAddress,
    userAgent,
  };
}

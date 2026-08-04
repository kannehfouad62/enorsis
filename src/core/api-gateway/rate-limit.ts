import { prisma } from "@/lib/prisma";
import type { ApiIdentity } from "./authenticate";
import { ApiGatewayError } from "./authenticate";

export async function enforceApiRateLimit(identity: ApiIdentity) {
  const now = new Date();
  const minuteStart = new Date(now.getTime() - 60_000);
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [minuteCount, dayCount] = await Promise.all([
    prisma.apiRequestLog.count({
      where: {
        apiClientId: identity.apiClientId,
        createdAt: { gte: minuteStart },
        outcome: { in: ["ALLOWED", "ERROR"] },
      },
    }),
    prisma.apiRequestLog.count({
      where: {
        apiClientId: identity.apiClientId,
        createdAt: { gte: dayStart },
        outcome: { in: ["ALLOWED", "ERROR"] },
      },
    }),
  ]);

  if (minuteCount >= identity.requestsPerMinute) {
    throw new ApiGatewayError(429, "RATE_LIMIT_MINUTE");
  }

  if (dayCount >= identity.requestsPerDay) {
    throw new ApiGatewayError(429, "RATE_LIMIT_DAY");
  }
}

import { hashApiKey } from "./crypto";
import { isRequestIpAllowed } from "./network";
import { prisma } from "@/lib/prisma";

export interface ApiIdentity {
  tenantId: string;
  apiClientId: string;
  credentialId: string;
  scopes: string[];
  requestsPerMinute: number;
  requestsPerDay: number;
}

export async function authenticateApiRequest(
  request: Request,
  requiredScope: string,
): Promise<ApiIdentity> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer enorsis_")) {
    throw new ApiGatewayError(401, "API_KEY_REQUIRED");
  }

  const plaintext = authorization.slice("Bearer ".length);
  const secretHash = hashApiKey(plaintext);

  const credential = await prisma.apiCredential.findUnique({
    where: { secretHash },
    include: { apiClient: true },
  });

  if (
    !credential ||
    credential.status !== "ACTIVE" ||
    credential.apiClient.status !== "ACTIVE"
  ) {
    throw new ApiGatewayError(401, "API_KEY_INVALID");
  }

  if (credential.expiresAt && credential.expiresAt <= new Date()) {
    await prisma.apiCredential.update({
      where: { id: credential.id },
      data: { status: "EXPIRED" },
    });

    throw new ApiGatewayError(401, "API_KEY_EXPIRED");
  }

  if (!credential.apiClient.allowedScopes.includes(requiredScope)) {
    throw new ApiGatewayError(403, "INSUFFICIENT_SCOPE");
  }

  if (
    !isRequestIpAllowed(
      request,
      credential.apiClient.allowedIpCidrs,
    )
  ) {
    throw new ApiGatewayError(403, "IP_NOT_ALLOWED");
  }

  await prisma.apiCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tenantId: credential.apiClient.tenantId,
    apiClientId: credential.apiClientId,
    credentialId: credential.id,
    scopes: credential.apiClient.allowedScopes,
    requestsPerMinute: credential.apiClient.requestsPerMinute,
    requestsPerDay: credential.apiClient.requestsPerDay,
  };
}

export class ApiGatewayError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

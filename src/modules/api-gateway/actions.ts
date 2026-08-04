"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { issueApiKey } from "@/core/api-gateway/crypto";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createApiClientAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);

  await prisma.apiClient.create({
    data: {
      tenantId: user.tenantId,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      allowedScopes: formData.getAll("allowedScopes").map(String),
      allowedIpCidrs: field(formData, "allowedIpCidrs")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      requestsPerMinute: Number(field(formData, "requestsPerMinute") || 60),
      requestsPerDay: Number(field(formData, "requestsPerDay") || 10000),
      createdByUserId: user.id,
    },
  });

  revalidatePath("/app/settings/api");
}

export async function issueApiCredentialAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const apiClientId = field(formData, "apiClientId");

  await prisma.apiClient.findFirstOrThrow({
    where: { id: apiClientId, tenantId: user.tenantId, status: "ACTIVE" },
  });

  const issued = issueApiKey();

  await prisma.apiCredential.create({
    data: {
      apiClientId,
      name: field(formData, "name"),
      prefix: issued.prefix,
      secretHash: issued.hash,
      expiresAt: field(formData, "expiresAt")
        ? new Date(field(formData, "expiresAt"))
        : null,
      createdByUserId: user.id,
    },
  });

  return {
    plaintext: issued.plaintext,
    warning:
      "Copy this API key now. Enorsis stores only its hash and cannot display it again.",
  };
}

export async function revokeApiCredentialAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const credentialId = field(formData, "credentialId");

  const credential = await prisma.apiCredential.findFirstOrThrow({
    where: {
      id: credentialId,
      apiClient: { tenantId: user.tenantId },
    },
  });

  await prisma.apiCredential.update({
    where: { id: credential.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  revalidatePath("/app/settings/api");
}


export async function suspendApiClientAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const apiClientId = field(formData, "apiClientId");

  const client = await prisma.apiClient.findFirstOrThrow({
    where: { id: apiClientId, tenantId: user.tenantId },
  });

  await prisma.apiClient.update({
    where: { id: client.id },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
    },
  });

  revalidatePath("/app/settings/api");
  revalidatePath("/app/settings/api/analytics");
}

export async function reactivateApiClientAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_ADMIN", "TENANT_OWNER"]);
  const apiClientId = field(formData, "apiClientId");

  const client = await prisma.apiClient.findFirstOrThrow({
    where: {
      id: apiClientId,
      tenantId: user.tenantId,
      status: "SUSPENDED",
    },
  });

  await prisma.apiClient.update({
    where: { id: client.id },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
    },
  });

  revalidatePath("/app/settings/api");
  revalidatePath("/app/settings/api/analytics");
}

export async function revokeApiClientAction(formData: FormData) {
  const user = await requireAnyRole(["TENANT_OWNER"]);
  const apiClientId = field(formData, "apiClientId");

  const client = await prisma.apiClient.findFirstOrThrow({
    where: { id: apiClientId, tenantId: user.tenantId },
  });

  await prisma.$transaction([
    prisma.apiClient.update({
      where: { id: client.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    }),
    prisma.apiCredential.updateMany({
      where: {
        apiClientId: client.id,
        status: "ACTIVE",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/app/settings/api");
  revalidatePath("/app/settings/api/analytics");
}

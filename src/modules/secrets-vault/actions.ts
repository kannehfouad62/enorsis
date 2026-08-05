"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createVaultSecret,
  revokeVaultSecret,
  rotateVaultSecret,
} from "@/core/vault";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createVaultSecretAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await createVaultSecret({
    tenantId: user.roles.some((role) =>
      ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"].includes(role),
    )
      ? null
      : user.tenantId,
    key: field(data, "key"),
    name: field(data, "name"),
    description: field(data, "description") || null,
    secretType: field(data, "secretType") as
      | "API_KEY"
      | "BEARER_TOKEN"
      | "BASIC_AUTH"
      | "OAUTH_CLIENT_SECRET"
      | "PRIVATE_KEY"
      | "CERTIFICATE"
      | "SSH_KEY"
      | "WEBHOOK_SECRET"
      | "DATABASE_CREDENTIAL"
      | "ENCRYPTION_KEY"
      | "CUSTOM",
    provider: field(data, "provider") || null,
    environment: field(data, "environment") || "PRODUCTION",
    plaintext: field(data, "plaintext"),
    expiresAt: field(data, "expiresAt")
      ? new Date(field(data, "expiresAt"))
      : null,
    userId: user.id,
  });

  revalidatePath("/app/settings/secrets");
}

export async function rotateVaultSecretAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await rotateVaultSecret({
    secretId: field(data, "secretId"),
    plaintext: field(data, "plaintext"),
    expiresAt: field(data, "expiresAt")
      ? new Date(field(data, "expiresAt"))
      : null,
    userId: user.id,
  });

  revalidatePath("/app/settings/secrets");
}

export async function revokeVaultSecretAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await revokeVaultSecret({
    secretId: field(data, "secretId"),
    userId: user.id,
    reason: field(data, "reason") || "Revoked by administrator.",
  });

  revalidatePath("/app/settings/secrets");
}

export async function grantVaultServiceAccessAction(data: FormData) {
  await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  await prisma.vaultSecretAccessPolicy.create({
    data: {
      secretId: field(data, "secretId"),
      serviceKey: field(data, "serviceKey"),
      action: field(data, "action") as
        | "READ"
        | "WRITE"
        | "ROTATE"
        | "REVOKE",
      expiresAt: field(data, "expiresAt")
        ? new Date(field(data, "expiresAt"))
        : null,
    },
  });

  revalidatePath("/app/settings/secrets");
}

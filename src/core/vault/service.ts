import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  decryptVaultValue,
  encryptVaultValue,
} from "./crypto";

export async function createVaultSecret({
  tenantId,
  key,
  name,
  description,
  secretType,
  provider,
  environment = "PRODUCTION",
  plaintext,
  expiresAt,
  userId,
}: {
  tenantId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  secretType:
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
    | "CUSTOM";
  provider?: string | null;
  environment?: string;
  plaintext: string;
  expiresAt?: Date | null;
  userId?: string | null;
}) {
  if (!plaintext) {
    throw new Error("Secret value is required.");
  }

  const encrypted = encryptVaultValue(plaintext);

  return prisma.$transaction(async (tx) => {
    const secret = await tx.vaultSecret.create({
      data: {
        tenantId: tenantId ?? null,
        key,
        name,
        description: description ?? null,
        secretType,
        provider: provider ?? null,
        environment,
        expiresAt: expiresAt ?? null,
        createdByUserId: userId ?? null,
        updatedByUserId: userId ?? null,
      },
    });

    await tx.vaultSecretVersion.create({
      data: {
        secretId: secret.id,
        version: 1,
        ...encrypted,
        createdByUserId: userId ?? null,
        expiresAt: expiresAt ?? null,
      },
    });

    await tx.vaultSecretAccessLog.create({
      data: {
        secretId: secret.id,
        action: "WRITE",
        actorUserId: userId ?? null,
        success: true,
        reason: "Secret created.",
        secretVersion: 1,
        correlationId: randomUUID(),
      },
    });

    return secret;
  });
}

export async function rotateVaultSecret({
  secretId,
  plaintext,
  expiresAt,
  userId,
}: {
  secretId: string;
  plaintext: string;
  expiresAt?: Date | null;
  userId?: string | null;
}) {
  const secret = await prisma.vaultSecret.findUniqueOrThrow({
    where: { id: secretId },
  });

  const nextVersion = secret.currentVersion + 1;
  const encrypted = encryptVaultValue(plaintext);

  return prisma.$transaction(async (tx) => {
    await tx.vaultSecretVersion.create({
      data: {
        secretId,
        version: nextVersion,
        ...encrypted,
        createdByUserId: userId ?? null,
        rotatedFromVersion: secret.currentVersion,
        expiresAt: expiresAt ?? secret.expiresAt,
      },
    });

    const updated = await tx.vaultSecret.update({
      where: { id: secretId },
      data: {
        currentVersion: nextVersion,
        lastRotatedAt: new Date(),
        expiresAt: expiresAt ?? secret.expiresAt,
        updatedByUserId: userId ?? null,
        status: "ACTIVE",
      },
    });

    await tx.vaultSecretAccessLog.create({
      data: {
        secretId,
        action: "ROTATE",
        actorUserId: userId ?? null,
        success: true,
        reason: "Secret rotated.",
        secretVersion: nextVersion,
        correlationId: randomUUID(),
      },
    });

    return updated;
  });
}

export async function readVaultSecret({
  secretReference,
  tenantId,
  actorUserId,
  serviceKey,
  reason,
}: {
  secretReference: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  serviceKey?: string | null;
  reason: string;
}) {
  const secret = await prisma.vaultSecret.findFirst({
    where: {
      key: secretReference,
      OR: [
        { tenantId: tenantId ?? null },
        { tenantId: null },
      ],
      status: "ACTIVE",
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      accessPolicies: {
        where: {
          active: true,
          action: "READ",
          OR: [
            ...(actorUserId ? [{ userId: actorUserId }] : []),
            ...(serviceKey ? [{ serviceKey }] : []),
          ],
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          ],
        },
      },
    },
    orderBy: { tenantId: "desc" },
  });

  if (!secret || secret.versions.length === 0) {
    throw new Error(`Secret reference ${secretReference} was not found.`);
  }

  const authorized =
    secret.accessPolicies.length > 0 ||
    Boolean(serviceKey && serviceKey.startsWith("platform:"));

  if (!authorized) {
    await prisma.vaultSecretAccessLog.create({
      data: {
        secretId: secret.id,
        action: "READ",
        actorUserId: actorUserId ?? null,
        serviceKey: serviceKey ?? null,
        success: false,
        reason: "Access policy denied the request.",
        secretVersion: secret.currentVersion,
      },
    });

    throw new Error("Vault secret access denied.");
  }

  const version = secret.versions[0];
  const plaintext = decryptVaultValue(version);

  await prisma.$transaction([
    prisma.vaultSecret.update({
      where: { id: secret.id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    }),
    prisma.vaultSecretAccessLog.create({
      data: {
        secretId: secret.id,
        action: "READ",
        actorUserId: actorUserId ?? null,
        serviceKey: serviceKey ?? null,
        success: true,
        reason,
        secretVersion: version.version,
        correlationId: randomUUID(),
      },
    }),
  ]);

  return plaintext;
}

export async function revokeVaultSecret({
  secretId,
  userId,
  reason,
}: {
  secretId: string;
  userId?: string | null;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const secret = await tx.vaultSecret.update({
      where: { id: secretId },
      data: {
        status: "REVOKED",
        updatedByUserId: userId ?? null,
      },
    });

    await tx.vaultSecretAccessLog.create({
      data: {
        secretId,
        action: "REVOKE",
        actorUserId: userId ?? null,
        success: true,
        reason,
        secretVersion: secret.currentVersion,
      },
    });

    return secret;
  });
}

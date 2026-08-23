import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  listPlaidTreasuryAccounts,
} from "@/core/integrations/providers/plaid-treasury";
import { prisma } from "@/lib/prisma";

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getPlaidTreasuryMappingWorkspace(
  connectionId: string,
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const permitted =
    session.user.roles.some((role) =>
      [
        "TENANT_OWNER",
        "TENANT_ADMIN",
        "FINANCE",
        "PLATFORM_SUPER_ADMIN",
        "PLATFORM_SUPPORT",
      ].includes(role),
    );

  if (!permitted) {
    redirect("/app/unauthorized");
  }

  const connection =
    await prisma.enterpriseConnectorConnection.findFirstOrThrow({
      where: {
        id: connectionId,
        tenantId: session.user.tenantId,
      },
      include: {
        connectorDefinition: true,
        credentials: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

  if (
    connection.connectorDefinition.key !==
    "plaid-treasury"
  ) {
    throw new Error(
      "This connection is not a Plaid Treasury connection.",
    );
  }

  const accounts =
    await listPlaidTreasuryAccounts({
      tenantId: connection.tenantId,
      connectionId: connection.id,
      configuration: asRecord(
        connection.configuration,
      ),
      baseUrl: connection.baseUrl,
      secretReferences:
        connection.credentials.map(
          (credential) =>
            credential.secretReference,
        ),
      credentials:
        connection.credentials.map(
          (credential) => ({
            name: credential.name,
            credentialType:
              credential.credentialType,
            secretReference:
              credential.secretReference,
          }),
        ),
    });

  const treasuryAccounts =
    await prisma.treasuryAccount.findMany({
      where: {
        tenantId: session.user.tenantId,
        active: true,
      },
      orderBy: [
        { accountType: "asc" },
        { name: "asc" },
      ],
    });

  const configuration = asRecord(
    connection.configuration,
  );
  const savedMap = asRecord(
    configuration.treasuryAccountMap,
  );

  return {
    connection,
    plaidAccounts: accounts,
    treasuryAccounts,
    savedMap,
  };
}

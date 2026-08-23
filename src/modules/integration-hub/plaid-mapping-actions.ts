"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function savePlaidTreasuryAccountMapAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
  ]);

  const connectionId = String(
    data.get("connectionId") ?? "",
  ).trim();

  if (!connectionId) {
    throw new Error(
      "Plaid connection ID is required.",
    );
  }

  const connection =
    await prisma.enterpriseConnectorConnection.findFirstOrThrow({
      where: {
        id: connectionId,
        tenantId: user.tenantId,
      },
      include: {
        connectorDefinition: true,
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

  const entries = [...data.entries()]
    .filter(([key]) =>
      key.startsWith("plaidAccount:"),
    )
    .map(([key, value]) => {
      const plaidAccountId = key
        .slice("plaidAccount:".length)
        .trim();

      const treasuryAccountId =
        String(value).trim();

      return [
        plaidAccountId,
        treasuryAccountId,
      ] as const;
    })
    .filter(
      ([
        plaidAccountId,
        treasuryAccountId,
      ]) =>
        plaidAccountId.length > 0 &&
        treasuryAccountId.length > 0,
    );

  const treasuryAccountIds = [
    ...new Set(
      entries.map(
        ([, treasuryAccountId]) =>
          treasuryAccountId,
      ),
    ),
  ];

  if (treasuryAccountIds.length > 0) {
    const validAccounts =
      await prisma.treasuryAccount.findMany({
        where: {
          id: {
            in: treasuryAccountIds,
          },
          tenantId: user.tenantId,
          active: true,
        },
        select: {
          id: true,
        },
      });

    const validIds = new Set(
      validAccounts.map(
        (account) => account.id,
      ),
    );

    const invalidIds =
      treasuryAccountIds.filter(
        (id) => !validIds.has(id),
      );

    if (invalidIds.length > 0) {
      throw new Error(
        "One or more selected Treasury accounts are invalid.",
      );
    }
  }

  const currentConfiguration =
    asRecord(connection.configuration);

  const treasuryAccountMap =
    Object.fromEntries(entries);

  await prisma.enterpriseConnectorConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      configuration: toJson({
        ...currentConfiguration,
        treasuryAccountMap,
      }),
      updatedByUserId: user.id,
    },
  });

  revalidatePath(
    `/app/settings/integration-hub/plaid/${connection.id}`,
  );

  revalidatePath(
    "/app/settings/integration-hub",
  );

  revalidatePath(
    "/app/requisition-to-order/treasury",
  );
}
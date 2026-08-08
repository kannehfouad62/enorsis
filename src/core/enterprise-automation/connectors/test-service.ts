import { prisma } from "@/lib/prisma";
import { resolveAutomationConnectorConfiguration } from "./registry-service";
import {
  resolveConnectorSecret,
  validateAutomationConnectorUrl,
} from "./security";

export async function testAutomationConnector(input: {
  tenantId: string;
  connectorId: string;
}) {
  const connector =
    await prisma.enterpriseAutomationConnector.findFirstOrThrow({
      where: {
        id: input.connectorId,
        tenantId: input.tenantId,
      },
    });

  try {
    if (connector.type === "HTTP" || connector.type === "WEBHOOK") {
      const resolved =
        await resolveAutomationConnectorConfiguration({
          tenantId: input.tenantId,
          connectorKey: connector.connectorKey,
        });

      validateAutomationConnectorUrl({
        url: String(resolved.configuration.url ?? ""),
        allowedHosts: resolved.configuration.allowedHosts,
      });

      if (resolved.configuration.secretEnvKey) {
        resolveConnectorSecret(
          String(resolved.configuration.secretEnvKey),
        );
      }
    }

    await prisma.enterpriseAutomationConnector.update({
      where: { id: connector.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: "PASSED",
        lastTestMessage:
          "Connector configuration passed governance validation.",
      },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connector test failed.";

    await prisma.enterpriseAutomationConnector.update({
      where: { id: connector.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: "FAILED",
        lastTestMessage: message,
      },
    });

    return { ok: false, message };
  }
}

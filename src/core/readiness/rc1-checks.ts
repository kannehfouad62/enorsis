import { prisma } from "@/lib/prisma";
import type { ReadinessCheck } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const rc1ReadinessChecks: readonly ReadinessCheck[] = [
  async () => {
    const started = Date.now();
    const count =
      await prisma.enterpriseAutomationConnector.count({
        where: {
          status: "ACTIVE",
          consecutiveFailures: { gte: 5 },
        },
      });

    return {
      key: "rc1.automation.open-circuits",
      category: "RC1 Automation",
      name: "Active automation connectors at circuit threshold",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "HIGH",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review connector observability, recover failed connectors, or document an RC1 waiver."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const since = new Date(Date.now() - DAY_MS);
    const count =
      await prisma.enterpriseIntegrationSyncRun.count({
        where: {
          status: "FAILED",
          createdAt: { gte: since },
        },
      });

    return {
      key: "rc1.integrations.failed-syncs",
      category: "RC1 Integrations",
      name: "Failed enterprise synchronization runs in 24 hours",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review Integration Hub failures and validate provider credentials, mappings, and endpoints."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const since = new Date(Date.now() - DAY_MS);
    const count = await prisma.aiExecution.count({
      where: {
        status: "FAILED",
        createdAt: { gte: since },
      },
    });

    return {
      key: "rc1.ai.failed-executions",
      category: "RC1 AI Governance",
      name: "Failed governed AI executions in 24 hours",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review AI execution failures, model configuration, prompt governance, and provider availability."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.workflowTask.count({
      where: {
        status: "ESCALATED",
      },
    });

    return {
      key: "rc1.workflows.escalated-tasks",
      category: "RC1 Workflows",
      name: "Escalated workflow tasks",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review workflow escalations, SLA ownership, delegation, and unresolved approval paths."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const activeConnections =
      await prisma.enterpriseConnectorConnection.count({
        where: { status: "ACTIVE" },
      });
    const unhealthyConnections =
      await prisma.enterpriseConnectorConnection.count({
        where: {
          status: "ACTIVE",
          healthStatus: { not: "HEALTHY" },
        },
      });

    return {
      key: "rc1.integrations.health-coverage",
      category: "RC1 Integrations",
      name: "Active enterprise integration health",
      status:
        unhealthyConnections === 0 ? "PASS" : "WARN",
      severity:
        unhealthyConnections === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: `${activeConnections - unhealthyConnections}/${activeConnections} healthy`,
      expectedValue: `${activeConnections}/${activeConnections} healthy`,
      remediation:
        unhealthyConnections > 0
          ? "Run Integration Hub health checks and resolve active connections that are not healthy."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
];

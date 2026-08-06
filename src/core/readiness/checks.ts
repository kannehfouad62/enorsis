import { prisma } from "@/lib/prisma";
import type { ReadinessCheck } from "./types";

const envCheck = (
  key: string,
  name: string,
  variable: string,
  blocking = true,
): ReadinessCheck => async () => {
  const started = Date.now();
  const configured = Boolean(process.env[variable]);

  return {
    key,
    category: "Environment",
    name,
    status: configured ? "PASS" : "FAIL",
    severity: configured ? "INFO" : "CRITICAL",
    releaseBlocking: blocking,
    observedValue: configured ? "CONFIGURED" : "MISSING",
    expectedValue: "CONFIGURED",
    remediation: configured
      ? undefined
      : `Configure ${variable} in every deployed environment.`,
    durationMs: Date.now() - started,
  };
};

export const readinessChecks: readonly ReadinessCheck[] = [
  async () => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        key: "database.connectivity",
        category: "Database",
        name: "Database connectivity",
        status: "PASS",
        severity: "INFO",
        releaseBlocking: true,
        observedValue: "REACHABLE",
        expectedValue: "REACHABLE",
        durationMs: Date.now() - started,
      };
    } catch (error) {
      return {
        key: "database.connectivity",
        category: "Database",
        name: "Database connectivity",
        status: "FAIL",
        severity: "CRITICAL",
        releaseBlocking: true,
        observedValue: "UNREACHABLE",
        expectedValue: "REACHABLE",
        remediation: "Verify DATABASE_URL and Prisma Data Platform availability.",
        evidence: {
          message: error instanceof Error ? error.message : "Unknown database error.",
        },
        durationMs: Date.now() - started,
      };
    }
  },
  envCheck("environment.database-url", "DATABASE_URL", "DATABASE_URL"),
  envCheck("environment.auth-secret", "Authentication secret", "AUTH_SECRET"),
  envCheck("environment.cron-secret", "Cron processor secret", "CRON_SECRET"),
  envCheck(
    "environment.vault-master-key",
    "Vault master key",
    "ENORSIS_VAULT_MASTER_KEY",
  ),
  async () => {
    const started = Date.now();
    const count = await prisma.platformJobExecution.count({
      where: { status: "DEAD_LETTER" },
    });
    return {
      key: "jobs.dead-letter",
      category: "Background Jobs",
      name: "Dead-letter job executions",
      status: count === 0 ? "PASS" : "FAIL",
      severity: count === 0 ? "INFO" : "HIGH",
      releaseBlocking: count > 0,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Resolve or explicitly waive dead-letter job executions."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.platformEventDelivery.count({
      where: { status: "DEAD_LETTER" },
    });
    return {
      key: "events.dead-letter",
      category: "Event Bus",
      name: "Dead-letter event deliveries",
      status: count === 0 ? "PASS" : "FAIL",
      severity: count === 0 ? "INFO" : "HIGH",
      releaseBlocking: count > 0,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Resolve or explicitly waive dead-letter event deliveries."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.enterpriseNotificationDelivery.count({
      where: { status: "DEAD_LETTER" },
    });
    return {
      key: "notifications.dead-letter",
      category: "Notifications",
      name: "Dead-letter notification deliveries",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review notification provider configuration and retry history."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.enterpriseConnectorConnection.count({
      where: { status: "ERROR" },
    });
    return {
      key: "integrations.error-connections",
      category: "Integrations",
      name: "Connector connections in error",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0
          ? "Review connector health checks and failed synchronization runs."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.vaultSecret.count({
      where: {
        status: "ACTIVE",
        expiresAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    });
    return {
      key: "vault.expiring-secrets",
      category: "Secrets Vault",
      name: "Secrets expiring within 30 days",
      status: count === 0 ? "PASS" : "WARN",
      severity: count === 0 ? "INFO" : "MEDIUM",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "0",
      remediation:
        count > 0 ? "Rotate or renew secrets approaching expiration." : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const count = await prisma.enterprisePolicyDefinition.count({
      where: { status: "ACTIVE" },
    });
    return {
      key: "policies.active-definitions",
      category: "Policy Framework",
      name: "Active policy definitions",
      status: count > 0 ? "PASS" : "WARN",
      severity: count > 0 ? "INFO" : "LOW",
      releaseBlocking: false,
      observedValue: String(count),
      expectedValue: "At least 1",
      remediation:
        count === 0 ? "Seed foundational enterprise policies." : undefined,
      durationMs: Date.now() - started,
    };
  },
  async () => {
    const started = Date.now();
    const tenantCount = await prisma.tenant.count();
    const configurationCount = await prisma.tenantConfiguration.count();

    return {
      key: "tenants.configuration-coverage",
      category: "Tenant Governance",
      name: "Tenant configuration coverage",
      status:
        tenantCount === 0 || configurationCount >= tenantCount
          ? "PASS"
          : "WARN",
      severity:
        tenantCount === 0 || configurationCount >= tenantCount
          ? "INFO"
          : "MEDIUM",
      releaseBlocking: false,
      observedValue: `${configurationCount}/${tenantCount}`,
      expectedValue: `${tenantCount}/${tenantCount}`,
      remediation:
        configurationCount < tenantCount
          ? "Create TenantConfiguration records for uncovered tenants."
          : undefined,
      durationMs: Date.now() - started,
    };
  },
];

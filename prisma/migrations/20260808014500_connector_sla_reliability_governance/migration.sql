-- Phase B2.9.2.12 — Connector SLA, Reliability Governance & Automated Remediation

ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'SLA_BREACH_DETECTED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'SLA_RECOVERED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'RELIABILITY_POLICY_UPDATED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'REMEDIATION_TRIGGERED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'REMEDIATION_SUCCEEDED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType"
  ADD VALUE IF NOT EXISTS 'REMEDIATION_FAILED';

ALTER TABLE "EnterpriseAutomationConnector"
  ADD COLUMN "slaTargetPercent" DOUBLE PRECISION NOT NULL DEFAULT 99,
  ADD COLUMN "slaWindowHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "slaBreached" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "slaBreachCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastSlaBreachAt" TIMESTAMP(3),
  ADD COLUMN "lastSlaRecoveredAt" TIMESTAMP(3),
  ADD COLUMN "autoRemediationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remediationFailureThreshold" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "remediationCooldownMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "remediationCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastRemediationAt" TIMESTAMP(3);

-- Phase B2.9.2.11 — Connector Circuit Breaker, Self-Healing & Recovery
ALTER TYPE "EnterpriseAutomationConnectorAuditType" ADD VALUE IF NOT EXISTS 'CIRCUIT_OPENED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType" ADD VALUE IF NOT EXISTS 'CIRCUIT_BLOCKED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType" ADD VALUE IF NOT EXISTS 'CIRCUIT_RECOVERY_SUCCEEDED';
ALTER TYPE "EnterpriseAutomationConnectorAuditType" ADD VALUE IF NOT EXISTS 'CIRCUIT_RECOVERY_FAILED';

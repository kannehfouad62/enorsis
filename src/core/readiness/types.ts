export type ReadinessCheckResult = {
  key: string;
  category: string;
  name: string;
  description?: string;
  status: "PASS" | "WARN" | "FAIL" | "SKIPPED";
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  releaseBlocking?: boolean;
  observedValue?: string;
  expectedValue?: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  durationMs?: number;
};

export type ReadinessCheck = () => Promise<ReadinessCheckResult>;

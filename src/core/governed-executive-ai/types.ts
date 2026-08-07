export type DeterministicExecutiveInsightCandidate = {
  insightKey: string;
  type:
    | "RISK"
    | "OPPORTUNITY"
    | "PERFORMANCE"
    | "ANOMALY"
    | "GOVERNANCE"
    | "FORECAST";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  executiveSummary: string;
  explanation: string;
  recommendation?: string | null;
  confidenceScore: number;
  domain: string;
  category?: string | null;
  sourceModule: string;
  requiresHumanReview?: boolean;
  evidence: Array<{
    metricKey?: string | null;
    sourceType: string;
    sourceId?: string | null;
    label: string;
    observedValue?: string | null;
    expectedValue?: string | null;
    evidence?: Record<string, unknown>;
  }>;
};

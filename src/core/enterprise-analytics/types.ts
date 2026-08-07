export type AnalyticsPeriod = {
  periodType:
    | "HOURLY"
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY"
    | "POINT_IN_TIME";
  periodStart: Date;
  periodEnd: Date;
};

export type AnalyticsMetricCalculation = {
  metricKey: string;
  value: number;
  sourceRecordCount: number;
  dimensions?: Record<string, string | number | boolean | null>;
  dimensionKey?: string;
};

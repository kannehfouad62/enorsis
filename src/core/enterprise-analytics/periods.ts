import type { AnalyticsPeriod } from "./types";

export function dailyAnalyticsPeriod(date = new Date()): AnalyticsPeriod {
  const periodStart = new Date(date);
  periodStart.setUTCHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
  periodEnd.setMilliseconds(-1);

  return {
    periodType: "DAILY",
    periodStart,
    periodEnd,
  };
}

export function monthlyAnalyticsPeriod(date = new Date()): AnalyticsPeriod {
  const periodStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  periodEnd.setMilliseconds(-1);

  return {
    periodType: "MONTHLY",
    periodStart,
    periodEnd,
  };
}

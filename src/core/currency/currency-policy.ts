import { z } from "zod";

export const currencyPolicyModeSchema = z.enum([
  "USD_ONLY",
  "USD_WITH_LOCAL_DISPLAY",
  "TENANT_BASE_CURRENCY",
]);

export type CurrencyPolicyMode = z.infer<typeof currencyPolicyModeSchema>;

export const currencyPolicySchema = z
  .object({
    mode: currencyPolicyModeSchema,
    baseCurrencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    localDisplayCurrency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .nullable(),
    usdReportingEnabled: z.boolean(),
  })
  .superRefine((policy, context) => {
    if (policy.mode === "USD_ONLY" && policy.baseCurrencyCode !== "USD") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseCurrencyCode"],
        message: "USD_ONLY tenants must use USD as their base currency.",
      });
    }

    if (policy.mode === "USD_WITH_LOCAL_DISPLAY" && !policy.localDisplayCurrency) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localDisplayCurrency"],
        message: "A local display currency is required for USD_WITH_LOCAL_DISPLAY.",
      });
    }

    if (policy.mode === "TENANT_BASE_CURRENCY" && !policy.usdReportingEnabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usdReportingEnabled"],
        message: "USD reporting must remain enabled for global Enorsis reporting.",
      });
    }
  });

export type CurrencyPolicy = z.infer<typeof currencyPolicySchema>;

export interface MoneySnapshot {
  originalAmount: string;
  originalCurrency: string;
  tenantAmount: string;
  tenantCurrency: string;
  usdAmount: string;
  exchangeRateToTenant: string;
  exchangeRateToUsd: string;
  exchangeRateEffectiveAt: string;
  exchangeRateSource: string;
}

export function resolveDisplayCurrency(policy: CurrencyPolicy): string {
  switch (policy.mode) {
    case "USD_ONLY":
      return "USD";
    case "USD_WITH_LOCAL_DISPLAY":
      return policy.localDisplayCurrency ?? "USD";
    case "TENANT_BASE_CURRENCY":
      return policy.baseCurrencyCode;
  }
}

export function formatMoney(
  amount: number,
  currencyCode: string,
  locale = "en-US",
): string {
  if (!Number.isFinite(amount)) {
    throw new Error("Money amount must be a finite number.");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
}

export function requirePositiveExchangeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate must be a positive finite number.");
  }

  return rate;
}

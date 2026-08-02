import { z } from "zod";

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const countryCode = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

export const bootstrapOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200),
  countryCode,
  baseCurrencyCode: currencyCode,
});

export const updateCurrencyPolicySchema = z
  .object({
    currencyPolicyMode: z.enum([
      "USD_ONLY",
      "USD_WITH_LOCAL_DISPLAY",
      "TENANT_BASE_CURRENCY",
    ]),
    baseCurrencyCode: currencyCode,
    localDisplayCurrency: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .superRefine((value, context) => {
    if (
      value.currencyPolicyMode === "USD_WITH_LOCAL_DISPLAY" &&
      value.localDisplayCurrency?.length !== 3
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localDisplayCurrency"],
        message: "Enter a three-letter local display currency.",
      });
    }

    if (
      value.currencyPolicyMode === "USD_ONLY" &&
      value.baseCurrencyCode !== "USD"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseCurrencyCode"],
        message: "USD-only organizations must use USD.",
      });
    }
  });

export const createLegalEntitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200),
  countryCode,
  baseCurrencyCode: currencyCode,
  registrationNumber: z.string().trim().max(120).optional(),
});

export const createSiteSchema = z.object({
  legalEntityId: z.string().trim().optional(),
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  countryCode,
  city: z.string().trim().max(120).optional(),
  timeZone: z.string().trim().min(1).max(100),
});

export const createDepartmentSchema = z.object({
  legalEntityId: z.string().trim().optional(),
  siteId: z.string().trim().optional(),
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
});

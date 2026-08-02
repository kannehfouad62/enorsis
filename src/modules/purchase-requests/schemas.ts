import { z } from "zod";

const lineSchema = z.object({
  description: z.string().trim().min(2).max(500),
  category: z.string().trim().max(120).optional(),
  quantity: z.coerce.number().positive(),
  unitOfMeasure: z.string().trim().min(1).max(30),
  unitPrice: z.coerce.number().min(0),
  supplierSuggestion: z.string().trim().max(200).optional(),
});

export const createPurchaseRequestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  businessJustification: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  neededByDate: z.string().optional(),
  originalCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  exchangeRateToUsd: z.coerce.number().positive(),
  exchangeRateSource: z.string().trim().min(2).max(120),
  legalEntityId: z.string().trim().optional(),
  siteId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  lines: z.array(lineSchema).min(1).max(100),
});

export const approvalDecisionSchema = z.object({
  purchaseRequestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "RETURNED"]),
  comments: z.string().trim().max(2000).optional(),
});

import { z } from "zod";

export const createContractSchema = z.object({
  supplierId: z.string().min(1),
  sourcingEventId: z.string().optional(),
  title: z.string().trim().min(3).max(200),
  type: z.enum([
    "MASTER_SERVICE_AGREEMENT",
    "PURCHASE_AGREEMENT",
    "FRAMEWORK_AGREEMENT",
    "STATEMENT_OF_WORK",
    "NDA",
    "SOFTWARE_LICENSE",
    "PROFESSIONAL_SERVICES",
    "OTHER",
  ]),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  totalValue: z.coerce.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRenew: z.coerce.boolean().optional(),
  renewalNoticeDays: z.coerce.number().int().min(0).max(730),
  governingLaw: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(4000).optional(),
});

export const addClauseSchema = z.object({
  contractId: z.string().min(1),
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(20000),
  riskLevel: z.enum(["STANDARD", "REVIEW", "HIGH", "PROHIBITED"]),
});

export const addObligationSchema = z.object({
  contractId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  ownerUserId: z.string().optional(),
  dueDate: z.string().optional(),
  recurring: z.coerce.boolean().optional(),
  recurrenceRule: z.string().trim().max(200).optional(),
});

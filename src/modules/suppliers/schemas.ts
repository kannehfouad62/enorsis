import { z } from "zod";

export const createSupplierSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradingName: z.string().trim().max(200).optional(),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  taxIdentificationNo: z.string().trim().max(120).optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  primaryEmail: z.string().trim().email().optional().or(z.literal("")),
  primaryPhone: z.string().trim().max(60).optional(),
  categories: z.array(z.string().trim().min(1)).min(1),
  riskTier: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  diversityOwned: z.coerce.boolean().optional(),
  esgCommitted: z.coerce.boolean().optional(),
  contactName: z.string().trim().min(2).max(160),
  contactTitle: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(60).optional(),
});

export const reviewSupplierSchema = z.object({
  supplierId: z.string().min(1),
  decision: z.enum(["APPROVED", "SUSPENDED", "REJECTED"]),
  qualificationStatus: z.enum([
    "QUALIFIED",
    "CONDITIONALLY_QUALIFIED",
    "DISQUALIFIED",
  ]),
  riskTier: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

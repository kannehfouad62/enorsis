import { z } from "zod";

export const uploadSupplierDocumentSchema = z.object({
  supplierId: z.string().min(1),
  type: z.enum([
    "TAX",
    "INSURANCE",
    "CERTIFICATION",
    "LICENSE",
    "ESG",
    "FINANCIAL",
    "OTHER",
  ]),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const reviewSupplierDocumentSchema = z.object({
  documentId: z.string().min(1),
  decision: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

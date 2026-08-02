import { z } from "zod";

export const createSourcingEventSchema = z.object({
  type: z.enum(["RFI", "RFQ", "RFP"]),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(2000),
  scopeOfWork: z.string().trim().min(20).max(12000),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  estimatedValue: z.coerce.number().min(0).optional(),
  responseDeadline: z.string().optional(),
  supplierIds: z.array(z.string().min(1)).min(1),
});

export const submitResponseSchema = z.object({
  sourcingEventId: z.string().min(1),
  supplierId: z.string().min(1),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  totalBid: z.coerce.number().min(0),
  deliveryDays: z.coerce.number().int().min(0),
  technicalResponse: z.string().trim().min(10).max(12000),
});

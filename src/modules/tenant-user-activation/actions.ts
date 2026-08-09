"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeTenantUserActivation } from "@/core/tenant-user-activation/service";
import { hashPassword } from "@/modules/security/password";

export type TenantUserActivationState = { error?: string };

const schema = z
  .object({
    tenantId: z.string().trim().min(1),
    token: z.string().trim().min(20),
    password: z.string().min(12).max(200),
    confirmPassword: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
    if (!/[A-Z]/.test(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must contain an uppercase letter.",
      });
    }
    if (!/[a-z]/.test(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must contain a lowercase letter.",
      });
    }
    if (!/[0-9]/.test(value.password)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must contain a number.",
      });
    }
  });

export async function activateTenantUserAction(
  _state: TenantUserActivationState,
  formData: FormData,
): Promise<TenantUserActivationState> {
  const parsed = schema.safeParse({
    tenantId: String(formData.get("tenantId") ?? ""),
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Review the activation form." };
  }

  try {
    await consumeTenantUserActivation({
      tenantId: parsed.data.tenantId,
      rawToken: parsed.data.token,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Account activation failed.",
    };
  }

  redirect("/login?activated=1");
}

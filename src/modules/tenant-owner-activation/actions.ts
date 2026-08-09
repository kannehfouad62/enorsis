"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeTenantOwnerActivation } from "@/core/tenant-owner-activation/service";
import { hashPassword } from "@/modules/security/password";

export type TenantOwnerActivationState = {
  error?: string;
};

const schema = z
  .object({
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

export async function activateTenantOwnerAction(
  _state: TenantOwnerActivationState,
  formData: FormData,
): Promise<TenantOwnerActivationState> {
  const parsed = schema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(
      formData.get("confirmPassword") ?? "",
    ),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Review the activation form.",
    };
  }

  try {
    await consumeTenantOwnerActivation({
      rawToken: parsed.data.token,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Account activation failed.",
    };
  }

  redirect("/login?activated=1");
}

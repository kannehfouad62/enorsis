"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from "./password";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Authentication is required.");

  const currentPassword = value(formData, "currentPassword");
  const newPassword = value(formData, "newPassword");
  const confirmPassword = value(formData, "confirmPassword");

  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match.");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (!user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error("Current password is incorrect.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: session.user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "authentication.password_change",
        resourceType: "User",
        resourceId: user.id,
      },
    }),
  ]);

  await signOut({ redirectTo: "/login?passwordChanged=1" });
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = value(formData, "email").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.isActive) {
    const reset = createResetToken();
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: reset.tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Development delivery. Replace with Resend in the notification phase.
    console.info(`[Enorsis password reset] ${email}: ${reset.token}`);
  }

  redirect("/forgot-password?requested=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = value(formData, "token");
  const password = value(formData, "password");
  const confirmPassword = value(formData, "confirmPassword");

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new Error("This password reset link is invalid or expired.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?passwordReset=1");
}

export async function revokeMySessionsAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Authentication is required.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await signOut({ redirectTo: "/login?sessionsRevoked=1" });
}

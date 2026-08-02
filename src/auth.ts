import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { MembershipStatus, TenantStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

async function authorizeDatabaseUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
          tenant: { status: TenantStatus.ACTIVE },
        },
        include: { tenant: true },
        orderBy: { activatedAt: "asc" },
      },
    },
  });

  if (!user?.isActive || !user.passwordHash) {
    return null;
  }

  const passwordMatches = await compare(password, user.passwordHash);
  const membership = user.memberships[0];

  if (!passwordMatches || !membership) {
    return null;
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { lastActiveAt: new Date() },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: membership.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "authentication.sign_in",
      resourceType: "Membership",
      resourceId: membership.id,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    tenantName: membership.tenant.name,
    membershipId: membership.id,
    roles: membership.roles,
    approvalLimitUsd: membership.approvalLimitUsd?.toString() ?? null,
    legalEntityScopeIds: membership.legalEntityScopeIds,
    siteScopeIds: membership.siteScopeIds,
    departmentScopeIds: membership.departmentScopeIds,
    mustChangePassword: user.mustChangePassword,
    sessionVersion: user.sessionVersion,
  };
}

function authorizeRecoveryAdministrator(email: string, password: string) {
  const configuredEmail = process.env.ENORSIS_ADMIN_EMAIL?.toLowerCase();
  const configuredPassword = process.env.ENORSIS_ADMIN_PASSWORD;

  if (
    !configuredEmail ||
    !configuredPassword ||
    email !== configuredEmail ||
    password !== configuredPassword
  ) {
    return null;
  }

  return {
    id: "development-platform-admin",
    email: configuredEmail,
    name: process.env.ENORSIS_ADMIN_NAME ?? "Platform Administrator",
    tenantId: process.env.ENORSIS_DEMO_TENANT_ID ?? "tenant_enorsis",
    tenantSlug: process.env.ENORSIS_DEMO_TENANT_SLUG ?? "enorsis-global",
    tenantName: process.env.ENORSIS_DEMO_TENANT_NAME ?? "Enorsis Global",
    membershipId: "environment-recovery-membership",
    roles: ["PLATFORM_SUPER_ADMIN", "TENANT_OWNER"],
    approvalLimitUsd: null,
    legalEntityScopeIds: [],
    siteScopeIds: [],
    departmentScopeIds: [],
    mustChangePassword: false,
    sessionVersion: 1,
  };
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Enorsis account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const databaseUser = await authorizeDatabaseUser(
          parsed.data.email,
          parsed.data.password,
        );

        return (
          databaseUser ??
          authorizeRecoveryAdministrator(
            parsed.data.email,
            parsed.data.password,
          )
        );
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      if (!request.nextUrl.pathname.startsWith("/app")) return true;
      return Boolean(session?.user);
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.tenantName = user.tenantName;
        token.membershipId = user.membershipId;
        token.roles = user.roles;
        token.approvalLimitUsd = user.approvalLimitUsd;
        token.legalEntityScopeIds = user.legalEntityScopeIds;
        token.siteScopeIds = user.siteScopeIds;
        token.departmentScopeIds = user.departmentScopeIds;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
      } else if (
        typeof token.userId === "string" &&
        typeof token.sessionVersion === "number" &&
        token.userId !== "development-platform-admin"
      ) {
        const current = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { isActive: true, sessionVersion: true },
        });
        if (
          !current?.isActive ||
          current.sessionVersion !== token.sessionVersion
        ) {
          return null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (!session.user) {
        throw new Error("The authenticated session has no user.");
      }

      const requiredString = (value: unknown, field: string) => {
        if (typeof value !== "string" || !value) {
          throw new Error(`The authenticated session is missing ${field}.`);
        }
        return value;
      };

      const stringArray = (value: unknown) =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [];

      session.user.id = requiredString(token.userId, "userId");
      session.user.tenantId = requiredString(token.tenantId, "tenantId");
      session.user.tenantSlug = requiredString(token.tenantSlug, "tenantSlug");
      session.user.tenantName = requiredString(token.tenantName, "tenantName");
      session.user.membershipId = requiredString(
        token.membershipId,
        "membershipId",
      );
      session.user.roles = stringArray(token.roles);
      session.user.approvalLimitUsd =
        typeof token.approvalLimitUsd === "string"
          ? token.approvalLimitUsd
          : null;
      session.user.legalEntityScopeIds = stringArray(
        token.legalEntityScopeIds,
      );
      session.user.siteScopeIds = stringArray(token.siteScopeIds);
      session.user.departmentScopeIds = stringArray(
        token.departmentScopeIds,
      );
      session.user.mustChangePassword =
        token.mustChangePassword === true;
      session.user.sessionVersion =
        typeof token.sessionVersion === "number"
          ? token.sessionVersion
          : 1;

      if (session.user.roles.length === 0) {
        throw new Error("The authenticated session has no assigned roles.");
      }

      return session;
    },
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Enorsis development account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const configuredEmail = process.env.ENORSIS_ADMIN_EMAIL?.toLowerCase();
        const configuredPassword = process.env.ENORSIS_ADMIN_PASSWORD;

        if (
          !configuredEmail ||
          !configuredPassword ||
          parsed.data.email !== configuredEmail ||
          parsed.data.password !== configuredPassword
        ) {
          return null;
        }

        return {
          id: "development-platform-admin",
          email: configuredEmail,
          name: process.env.ENORSIS_ADMIN_NAME ?? "Platform Administrator",
          tenantId: process.env.ENORSIS_DEMO_TENANT_ID ?? "tenant_northstar",
          tenantSlug:
            process.env.ENORSIS_DEMO_TENANT_SLUG ?? "northstar-global",
          tenantName: process.env.ENORSIS_DEMO_TENANT_NAME ?? "Northstar Global",
          roles: ["PLATFORM_SUPER_ADMIN", "TENANT_OWNER"],
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const isProtectedRoute = request.nextUrl.pathname.startsWith("/app");

      if (!isProtectedRoute) {
        return true;
      }

      return Boolean(session?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.tenantName = user.tenantName;
        token.roles = user.roles;
      }

      return token;
    },
    session({ session, token }) {
      const userId =
        typeof token.userId === "string" ? token.userId : null;
      const tenantId =
        typeof token.tenantId === "string" ? token.tenantId : null;
      const tenantSlug =
        typeof token.tenantSlug === "string" ? token.tenantSlug : null;
      const tenantName =
        typeof token.tenantName === "string" ? token.tenantName : null;
      const roles = Array.isArray(token.roles)
        ? token.roles.filter(
            (role): role is string => typeof role === "string",
          )
        : [];

      if (
        !session.user ||
        !userId ||
        !tenantId ||
        !tenantSlug ||
        !tenantName ||
        roles.length === 0
      ) {
        throw new Error(
          "The authenticated session is missing required tenant identity.",
        );
      }

      session.user.id = userId;
      session.user.tenantId = tenantId;
      session.user.tenantSlug = tenantSlug;
      session.user.tenantName = tenantName;
      session.user.roles = roles;

      return session;
    },
  },
});

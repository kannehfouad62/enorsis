import type { DefaultSession } from "next-auth";

interface EnorsisIdentity {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  membershipId: string;
  roles: string[];
  approvalLimitUsd: string | null;
  legalEntityScopeIds: string[];
  siteScopeIds: string[];
  departmentScopeIds: string[];
}

declare module "next-auth" {
  interface User extends EnorsisIdentity {}

  interface Session {
    user: DefaultSession["user"] &
      EnorsisIdentity & {
        id: string;
      };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends EnorsisIdentity {
    userId: string;
  }
}

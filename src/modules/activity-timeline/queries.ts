import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEnterpriseActivityTimeline } from "@/core/activity";

export async function getActivityAdministration() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "AUDITOR",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  return getEnterpriseActivityTimeline({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    userRoles: session.user.roles,
    limit: 250,
  });
}

export async function getMyActivityTimeline() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return getEnterpriseActivityTimeline({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    userRoles: session.user.roles,
    limit: 100,
  });
}

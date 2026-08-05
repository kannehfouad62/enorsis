import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateTenantConfiguration } from "@/core/configuration";

export async function getTenantConfigurationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
    ].includes(role),
  );

  if (!permitted) redirect("/app/unauthorized");

  return getOrCreateTenantConfiguration({
    tenantId: session.user.tenantId,
    userId: session.user.id,
  });
}

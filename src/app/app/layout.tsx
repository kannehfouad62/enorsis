import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        tenantName: session.user.tenantName,
        roles: session.user.roles,
        mustChangePassword: session.user.mustChangePassword,
      }}
    >
      {children}
    </AppShell>
  );
}

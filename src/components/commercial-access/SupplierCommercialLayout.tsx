import { requireTenantCommercialPersona } from "@/core/tenancy/server-commercial-access";

export async function SupplierCommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTenantCommercialPersona(["SUPPLIER", "BUYER_SUPPLIER"]);
  return children;
}

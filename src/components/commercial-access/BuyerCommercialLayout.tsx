import { requireTenantCommercialPersona } from "@/core/tenancy/server-commercial-access";

export async function BuyerCommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTenantCommercialPersona(["BUYER", "BUYER_SUPPLIER"]);
  return children;
}

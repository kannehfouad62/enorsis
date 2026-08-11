import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { MarketplaceCheckout } from "@/components/marketplace/MarketplaceCheckout";
import { getMarketplaceCartCheckoutContext } from "@/modules/marketplace-commerce/queries";

export default async function MarketplaceCartPage() {
  const { tenant } = await getMarketplaceCartCheckoutContext();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Buyer Marketplace</p>
          <div className="mt-3 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-blue-700" />
            <h1 className="text-4xl font-black tracking-tight">Purchase Cart</h1>
          </div>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Convert selected marketplace offerings into the existing governed Enorsis Purchase Request workflow.
          </p>
        </div>
        <Link href="/app/marketplace/catalog" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>
      </div>
      <div className="mt-8">
        <MarketplaceCheckout
          legalEntities={tenant.legalEntities}
          sites={tenant.sites}
          departments={tenant.departments}
        />
      </div>
    </div>
  );
}

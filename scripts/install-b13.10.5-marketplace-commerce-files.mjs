#!/usr/bin/env node
import fs from "node:fs";

function write(path, content) {
  fs.mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(path, content);
  console.log(`Wrote: ${path}`);
}

write("src/modules/marketplace-commerce/queries.ts", `import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMarketplaceCartCheckoutContext() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      legalEntities: { orderBy: { name: "asc" } },
      sites: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" } },
    },
  });

  if (!tenant) redirect("/app/settings/organization");
  if (tenant.commercialPersona === "SUPPLIER") redirect("/app/unauthorized");

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      baseCurrencyCode: tenant.baseCurrencyCode,
      legalEntities: tenant.legalEntities.map((item) => ({ id: item.id, name: item.name })),
      sites: tenant.sites.map((item) => ({ id: item.id, name: item.name })),
      departments: tenant.departments.map((item) => ({ id: item.id, name: item.name })),
    },
  };
}

export async function getMarketplaceSellerOrders() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { commercialPersona: true },
  });

  if (!tenant || !["SUPPLIER", "BUYER_SUPPLIER"].includes(tenant.commercialPersona)) {
    redirect("/app/unauthorized");
  }

  const orders = await prisma.marketplaceSellerOrder.findMany({
    where: { sellerTenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return { orders };
}
`);

write("src/components/marketplace/MarketplaceAddToCartButton.tsx", `"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { MarketplaceCartItem } from "@/core/marketplace-commerce/types";

export const MARKETPLACE_CART_KEY = "enorsis.marketplace.cart.v1";

function readCart(): MarketplaceCartItem[] {
  try {
    const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function MarketplaceAddToCartButton({
  item,
}: {
  item: Omit<MarketplaceCartItem, "quantity">;
}) {
  const minimum = Math.max(1, item.minimumOrderQty ?? 1);
  const [quantity, setQuantity] = useState(minimum);
  const [message, setMessage] = useState<string | null>(null);

  function addToCart() {
    const cart = readCart();
    const index = cart.findIndex((entry) => entry.offeringId === item.offeringId);
    const next = { ...item, quantity };
    if (index >= 0) cart[index] = next;
    else cart.push(next);
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("enorsis-marketplace-cart"));
    setMessage("Added to purchase cart.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        aria-label={\`Quantity for \${item.offeringName}\`}
        type="number"
        min={minimum}
        step="1"
        value={quantity}
        onChange={(event) =>
          setQuantity(Math.max(minimum, Number(event.target.value) || minimum))
        }
        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={addToCart}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        Add to cart
      </button>
      {message ? <span className="text-xs font-semibold text-emerald-700">{message}</span> : null}
    </div>
  );
}
`);

write("src/components/marketplace/MarketplaceCartLink.tsx", `"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { MARKETPLACE_CART_KEY } from "./MarketplaceAddToCartButton";

export function MarketplaceCartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      try {
        const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        setCount(Array.isArray(cart) ? cart.length : 0);
      } catch {
        setCount(0);
      }
    };
    update();
    window.addEventListener("enorsis-marketplace-cart", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("enorsis-marketplace-cart", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Link
      href="/app/marketplace/cart"
      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"
    >
      <ShoppingCart className="h-4 w-4" />
      Purchase Cart
      {count > 0 ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-blue-700">{count}</span>
      ) : null}
    </Link>
  );
}
`);

write("src/app/app/marketplace/cart/page.tsx", `import Link from "next/link";
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
`);

write("src/components/marketplace/MarketplaceCheckout.tsx", `"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MARKETPLACE_CART_KEY } from "./MarketplaceAddToCartButton";
import { submitMarketplaceCartAction } from "@/modules/marketplace-commerce/actions";
import type { MarketplaceCartItem } from "@/core/marketplace-commerce/types";

type Option = { id: string; name: string };

export function MarketplaceCheckout({
  legalEntities,
  sites,
  departments,
}: {
  legalEntities: Option[];
  sites: Option[];
  departments: Option[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, []);

  const currency = items[0]?.currencyCode ?? "USD";
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  function updateQuantity(offeringId: string, quantity: number) {
    const next = items.map((item) =>
      item.offeringId === offeringId
        ? { ...item, quantity: Math.max(item.minimumOrderQty ?? 1, quantity || 1) }
        : item,
    );
    setItems(next);
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
  }

  function remove(offeringId: string) {
    const next = items.filter((item) => item.offeringId !== offeringId);
    setItems(next);
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return setError("Add at least one marketplace offering before submitting.");
    if (new Set(items.map((item) => item.currencyCode)).size !== 1) {
      return setError("Submit separate purchase requests for different currencies.");
    }

    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitMarketplaceCartAction({
        title: String(data.get("title") ?? ""),
        businessJustification: String(data.get("businessJustification") ?? ""),
        priority: String(data.get("priority") ?? "NORMAL") as "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
        neededByDate: String(data.get("neededByDate") ?? "") || undefined,
        originalCurrency: currency,
        exchangeRateToUsd: Number(data.get("exchangeRateToUsd") ?? 1),
        exchangeRateSource: String(data.get("exchangeRateSource") ?? "Marketplace checkout"),
        legalEntityId: String(data.get("legalEntityId") ?? "") || undefined,
        siteId: String(data.get("siteId") ?? "") || undefined,
        departmentId: String(data.get("departmentId") ?? "") || undefined,
        items,
      });
      localStorage.removeItem(MARKETPLACE_CART_KEY);
      window.dispatchEvent(new Event("enorsis-marketplace-cart"));
      router.push(\`/app/requests/\${result.purchaseRequestId}\`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Marketplace purchase request submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-black">Your purchase cart is empty</h2>
        <button type="button" onClick={() => router.push("/app/marketplace/catalog")} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
          Browse Marketplace
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Marketplace items</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.offeringId} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_150px_auto]">
              <div>
                <p className="font-black">{item.offeringName}</p>
                <p className="mt-1 text-xs text-slate-500">{item.supplierName}{item.sku ? \` · \${item.sku}\` : ""}</p>
              </div>
              <input
                type="number"
                min={item.minimumOrderQty ?? 1}
                value={item.quantity}
                onChange={(event) => updateQuantity(item.offeringId, Number(event.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <div className="flex items-center font-black">
                {item.currencyCode} {(item.quantity * item.unitPrice).toLocaleString()}
              </div>
              <button type="button" onClick={() => remove(item.offeringId)} className="text-sm font-black text-rose-700">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end text-lg font-black">Total: {currency} {total.toLocaleString()}</div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Purchase request details</h2>
        <p className="mt-2 text-sm text-slate-600">These are the existing governed Purchase Request fields.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="title" required minLength={3} placeholder="Purchase request title" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <select name="priority" defaultValue="NORMAL" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </select>
          <input name="neededByDate" type="date" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <select name="legalEntityId" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">Tenant-level legal entity</option>
            {legalEntities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="siteId" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">All sites / tenant level</option>
            {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="departmentId" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">All departments / tenant level</option>
            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input name="exchangeRateToUsd" type="number" step="0.000001" min="0.000001" defaultValue="1" required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input name="exchangeRateSource" defaultValue={currency === "USD" ? "USD base currency" : "Marketplace checkout"} required className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <textarea name="businessJustification" required minLength={10} placeholder="Business justification" className="min-h-32 rounded-xl border border-slate-200 px-3 py-2.5 text-sm md:col-span-2" />
        </div>
      </section>

      {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-60">
        {submitting ? "Submitting for approval..." : "Submit purchase request for approval"}
      </button>
    </form>
  );
}
`);

write("src/app/app/marketplace/orders/page.tsx", `import {
  acceptMarketplaceSellerOrderAction,
  rejectMarketplaceSellerOrderAction,
  shipMarketplaceSellerOrderAction,
} from "@/modules/marketplace-commerce/actions";
import { getMarketplaceSellerOrders } from "@/modules/marketplace-commerce/queries";

type SnapshotLine = {
  offeringName?: string;
  sku?: string | null;
  quantity?: number;
  unitOfMeasure?: string;
  unitPrice?: number;
};

export default async function MarketplaceSellerOrdersPage() {
  const { orders } = await getMarketplaceSellerOrders();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Seller Marketplace</p>
      <h1 className="mt-3 text-4xl font-black">Marketplace Orders</h1>
      <p className="mt-3 max-w-4xl leading-7 text-slate-600">
        Review buyer purchase orders, accept or reject them, and record shipment details. Goods receipt remains buyer-controlled.
      </p>
      <div className="mt-8 space-y-5">
        {orders.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="font-black">No marketplace orders yet.</p></div> : null}
        {orders.map((order) => {
          const lines = Array.isArray(order.lineSnapshot) ? (order.lineSnapshot as SnapshotLine[]) : [];
          return (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase text-slate-500">{order.orderNumber ?? "Order preparing"}</p><h2 className="mt-2 text-xl font-black">{order.buyerTenantName ?? "Marketplace buyer"}</h2></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{order.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-5 space-y-2">
                {lines.map((line, index) => (
                  <div key={index} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <span>{line.offeringName ?? "Marketplace item"}{line.sku ? \` · \${line.sku}\` : ""}</span>
                    <span className="font-black">{line.quantity ?? 0} {line.unitOfMeasure ?? ""} · {order.currencyCode} {Number(line.unitPrice ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-right text-lg font-black">Total: {order.currencyCode} {Number(order.totalAmount).toLocaleString()}</p>

              {order.status === "PLACED" ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <form action={acceptMarketplaceSellerOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">Accept order</button>
                  </form>
                  <form action={rejectMarketplaceSellerOrderAction} className="flex gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input name="reason" required placeholder="Rejection reason" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-700">Reject</button>
                  </form>
                </div>
              ) : null}

              {order.status === "ACCEPTED" ? (
                <form action={shipMarketplaceSellerOrderAction} className="mt-5 grid gap-3 md:grid-cols-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input name="carrier" required placeholder="Carrier" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="trackingNumber" required placeholder="Tracking number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="expectedDeliveryAt" type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">Mark shipped</button>
                </form>
              ) : null}

              {order.status === "SHIPPED" ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
                  <p><strong>Carrier:</strong> {order.carrier}</p>
                  <p className="mt-1"><strong>Tracking:</strong> {order.trackingNumber}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
`);

console.log("B13.10.5 marketplace UI/workspace files installed.");

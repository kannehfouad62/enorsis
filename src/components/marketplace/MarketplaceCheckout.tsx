"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MARKETPLACE_CART_KEY } from "./MarketplaceAddToCartButton";
import { submitMarketplaceCartAction } from "@/modules/marketplace-commerce/actions";
import type { MarketplaceCartItem } from "@/core/marketplace-commerce/types";

type Option = { id: string; name: string };

function cartLineKey(item: MarketplaceCartItem) {
  return `${item.offeringId}::${item.selectedSize ?? ""}`;
}

type ApproverOption = {
  userId: string;
  name: string;
  email: string;
  approvalLimitUsd: number | null;
};

export function MarketplaceCheckout({
  legalEntities,
  sites,
  departments,
  approvers,
}: {
  legalEntities: Option[];
  sites: Option[];
  departments: Option[];
  approvers: ApproverOption[];
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

  function updateQuantity(
    lineKey: string,
    quantity: number,
  ) {
    const next = items.map((item) =>
      cartLineKey(item) === lineKey
        ? {
            ...item,
            quantity: Math.max(
              item.minimumOrderQty ?? 1,
              quantity || 1,
            ),
          }
        : item,
    );
    setItems(next);
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
  }

  function remove(lineKey: string) {
    const next = items.filter(
      (item) => cartLineKey(item) !== lineKey,
    );
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
        preferredApproverId:
          String(data.get("preferredApproverId") ?? "") || undefined,
        items,
      });
      localStorage.removeItem(MARKETPLACE_CART_KEY);
      window.dispatchEvent(new Event("enorsis-marketplace-cart"));
      router.push(`/app/requests/${result.purchaseRequestId}`);
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
            <div key={cartLineKey(item)} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_150px_auto]">
              <div>
                <p className="font-black">{item.offeringName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.supplierName}
                  {item.sku ? ` · ${item.sku}` : ""}
                  {item.selectedSize
                    ? ` · Size ${item.selectedSize}`
                    : ""}
                </p>
              </div>
              <input
                type="number"
                min={item.minimumOrderQty ?? 1}
                value={item.quantity}
                onChange={(event) =>
                  updateQuantity(
                    cartLineKey(item),
                    Number(event.target.value),
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <div className="flex items-center font-black">
                {item.currencyCode} {(item.quantity * item.unitPrice).toLocaleString()}
              </div>
              <button type="button" onClick={() => remove(cartLineKey(item))} className="text-sm font-black text-rose-700">Remove</button>
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
          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 md:col-span-2">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Send approval request to
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Select an active Purchase Request approver. Their approval limit remains enforced.
              If the request exceeds their authority, they must escalate it to an approver with sufficient authority.
            </span>
            <select
              name="preferredApproverId"
              required
              defaultValue=""
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>Select approver</option>
              {approvers.map((approver) => (
                <option key={approver.userId} value={approver.userId}>
                  {approver.name} · {approver.email} · Limit USD{" "}
                  {approver.approvalLimitUsd == null
                    ? "Not configured"
                    : approver.approvalLimitUsd.toLocaleString()}
                </option>
              ))}
            </select>
          </label>

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

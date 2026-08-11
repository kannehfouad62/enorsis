"use client";

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
        aria-label={`Quantity for ${item.offeringName}`}
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

"use client";

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

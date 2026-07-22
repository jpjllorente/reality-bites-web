import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";

export interface CartItem {
  /** Composite unique key: slug::variantId::portion */
  key: string;
  product: Product;
  variantId?: string;
  variantName?: string;
  portion: boolean;
  /** Unit price in EUR at the moment of adding to the cart. */
  unitPrice: number;
  qty: number;
}

const STORAGE_KEY = "144reality_cart_v2";

type Listener = (items: CartItem[]) => void;
const listeners = new Set<Listener>();
let state: CartItem[] = [];
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      // Drop legacy shape (no `key` field).
      state = Array.isArray(parsed)
        ? parsed.filter((i) => i && typeof i.key === "string" && typeof i.unitPrice === "number")
        : [];
    }
  } catch {
    // ignore
  }
}

function commit(next: CartItem[]) {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l(next));
}

export function buildCartKey(slug: string, variantId?: string, portion?: boolean): string {
  return `${slug}::${variantId ?? ""}::${portion ? "p" : "f"}`;
}

export interface AddOptions {
  qty?: number;
  variantId?: string;
  variantName?: string;
  portion?: boolean;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    hydrate();
    setItems(state);
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    items,
    add(product: Product, opts: AddOptions = {}) {
      hydrate();
      const portion = !!opts.portion && product.portionPrice != null;
      const unitPrice = portion ? (product.portionPrice ?? product.price) : product.price;
      const key = buildCartKey(product.slug, opts.variantId, portion);
      const qty = opts.qty ?? 1;
      const existing = state.find((i) => i.key === key);
      const next = existing
        ? state.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
        : [
            ...state,
            {
              key,
              product,
              variantId: opts.variantId,
              variantName: opts.variantName,
              portion,
              unitPrice,
              qty,
            },
          ];
      commit(next);
    },
    remove(key: string) {
      commit(state.filter((i) => i.key !== key));
    },
    setQty(key: string, qty: number) {
      if (qty <= 0) return commit(state.filter((i) => i.key !== key));
      commit(state.map((i) => (i.key === key ? { ...i, qty } : i)));
    },
    clear() {
      commit([]);
    },
    get count() {
      return items.reduce((s, i) => s + i.qty, 0);
    },
    get total() {
      return items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    },
  };
}

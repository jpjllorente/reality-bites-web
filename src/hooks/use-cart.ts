import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";

export interface CartItem {
  product: Product;
  qty: number;
}

const STORAGE_KEY = "144reality_cart_v1";

type Listener = (items: CartItem[]) => void;
const listeners = new Set<Listener>();
let state: CartItem[] = [];
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as CartItem[];
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
    add(product: Product, qty = 1) {
      hydrate();
      const existing = state.find((i) => i.product.id === product.id);
      const next = existing
        ? state.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + qty } : i))
        : [...state, { product, qty }];
      commit(next);
    },
    remove(id: string) {
      commit(state.filter((i) => i.product.id !== id));
    },
    setQty(id: string, qty: number) {
      if (qty <= 0) return commit(state.filter((i) => i.product.id !== id));
      commit(state.map((i) => (i.product.id === id ? { ...i, qty } : i)));
    },
    clear() {
      commit([]);
    },
    get count() {
      return items.reduce((s, i) => s + i.qty, 0);
    },
    get total() {
      return items.reduce((s, i) => s + i.qty * i.product.price, 0);
    },
  };
}

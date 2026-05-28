import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PurchaseType } from "@/lib/pricing";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  purchaseType: PurchaseType;
  unitPrice: number;
  quantity: number;
  estimatedDeliveryDays?: number | null;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, purchaseType: PurchaseType) => void;
  setQty: (productId: string, purchaseType: PurchaseType, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const items = [...get().items];
        const idx = items.findIndex(
          (i) => i.productId === item.productId && i.purchaseType === item.purchaseType,
        );
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + item.quantity, unitPrice: item.unitPrice };
        } else {
          items.push(item);
        }
        set({ items });
      },
      remove: (productId, purchaseType) =>
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.purchaseType === purchaseType),
          ),
        }),
      setQty: (productId, purchaseType, qty) =>
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.purchaseType === purchaseType
              ? { ...i, quantity: Math.max(1, qty) }
              : i,
          ),
        }),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "sokoni-cart-v1" },
  ),
);
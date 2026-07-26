import { create } from 'zustand';
import { calcOrderTotals, resolveUnitPrice, type Product } from '@iq/shared';

export type CartLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

type CartState = {
  warehouseId: string;
  lines: CartLine[];
  discountPercent: number;
  setWarehouseId: (id: string) => void;
  addProduct: (product: Product, qty?: number) => void;
  updateQty: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
  setDiscount: (pct: number) => void;
  totals: () => { subtotal: number; taxTotal: number; total: number };
};

export const useCartStore = create<CartState>((set, get) => ({
  warehouseId: 'wh-main',
  lines: [],
  discountPercent: 0,

  setWarehouseId(id) {
    set({ warehouseId: id });
  },

  addProduct(product, qty = 1) {
    const lines = [...get().lines];
    const idx = lines.findIndex((l) => l.product.id === product.id);
    if (idx >= 0) {
      const quantity = lines[idx].quantity + qty;
      lines[idx] = {
        ...lines[idx],
        quantity,
        unitPrice: resolveUnitPrice(product, quantity),
      };
    } else {
      lines.push({
        product,
        quantity: qty,
        unitPrice: resolveUnitPrice(product, qty),
      });
    }
    set({ lines });
  },

  updateQty(productId, quantity) {
    if (quantity <= 0) {
      get().removeLine(productId);
      return;
    }
    set({
      lines: get().lines.map((l) =>
        l.product.id === productId
          ? {
              ...l,
              quantity,
              unitPrice: resolveUnitPrice(l.product, quantity),
            }
          : l,
      ),
    });
  },

  removeLine(productId) {
    set({ lines: get().lines.filter((l) => l.product.id !== productId) });
  },

  clear() {
    set({ lines: [], discountPercent: 0 });
  },

  setDiscount(pct) {
    set({ discountPercent: pct });
  },

  totals() {
    return calcOrderTotals(
      get().lines.map((l) => ({
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        taxRate: l.product.taxRate,
      })),
      get().discountPercent,
    );
  },
}));

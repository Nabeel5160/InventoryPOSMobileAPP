import type { PriceTier, Product } from './models';

/** Pick unit price from tiers by quantity (highest matching minQty wins). */
export function resolveUnitPrice(
  product: Pick<Product, 'basePrice' | 'priceTiers'>,
  quantity: number,
): number {
  const tiers = [...(product.priceTiers ?? [])].sort(
    (a, b) => b.minQty - a.minQty,
  );
  const match = tiers.find((t: PriceTier) => quantity >= t.minQty);
  return match?.unitPrice ?? product.basePrice;
}

export function calcLineTotals(
  unitPrice: number,
  quantity: number,
  taxRate: number,
  discountPercent = 0,
): { lineSubtotal: number; tax: number; lineTotal: number } {
  const raw = unitPrice * quantity;
  const discounted = raw * (1 - discountPercent / 100);
  const tax = discounted * taxRate;
  return {
    lineSubtotal: roundMoney(discounted),
    tax: roundMoney(tax),
    lineTotal: roundMoney(discounted + tax),
  };
}

export function calcOrderTotals(
  lines: Array<{ unitPrice: number; quantity: number; taxRate: number }>,
  discountPercent = 0,
): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const { lineSubtotal, tax } = calcLineTotals(
      line.unitPrice,
      line.quantity,
      line.taxRate,
      discountPercent,
    );
    subtotal += lineSubtotal;
    taxTotal += tax;
  }
  return {
    subtotal: roundMoney(subtotal),
    taxTotal: roundMoney(taxTotal),
    total: roundMoney(subtotal + taxTotal),
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isLowStock(quantity: number, reorderPoint: number): boolean {
  return quantity <= reorderPoint;
}

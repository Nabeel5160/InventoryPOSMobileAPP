import {
  calcLineTotals,
  calcOrderTotals,
  isLowStock,
  resolveUnitPrice,
  roundMoney,
} from './pricing';

describe('pricing helpers', () => {
  const product = {
    basePrice: 100,
    priceTiers: [
      { id: '1', productId: 'p1', minQty: 5, unitPrice: 90, currency: 'USD' },
      { id: '2', productId: 'p1', minQty: 10, unitPrice: 80, currency: 'USD' },
    ],
  };

  it('resolves base price for qty below tiers', () => {
    expect(resolveUnitPrice(product, 1)).toBe(100);
  });

  it('resolves tier price for matching qty', () => {
    expect(resolveUnitPrice(product, 5)).toBe(90);
    expect(resolveUnitPrice(product, 12)).toBe(80);
  });

  it('calculates line totals with tax and discount', () => {
    const result = calcLineTotals(100, 2, 0.1, 10);
    expect(result.lineSubtotal).toBe(180);
    expect(result.tax).toBe(18);
    expect(result.lineTotal).toBe(198);
  });

  it('calculates order totals', () => {
    const totals = calcOrderTotals(
      [
        { unitPrice: 100, quantity: 1, taxRate: 0.1 },
        { unitPrice: 50, quantity: 2, taxRate: 0.1 },
      ],
      0,
    );
    expect(totals.subtotal).toBe(200);
    expect(totals.taxTotal).toBe(20);
    expect(totals.total).toBe(220);
  });

  it('rounds money to 2 decimals', () => {
    // Avoid binary float edge cases like 1.005
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(10.994)).toBe(10.99);
    expect(roundMoney(10.999)).toBe(11);
  });

  it('detects low stock', () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(6, 5)).toBe(false);
  });
});

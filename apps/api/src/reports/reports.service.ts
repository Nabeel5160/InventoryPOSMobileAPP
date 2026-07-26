import { Injectable } from '@nestjs/common';
import { isLowStock } from '@iq/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async inventory() {
    const products = await this.prisma.product.findMany({
      include: { stockLevels: true },
    });
    let totalUnits = 0;
    let stockValue = 0;
    const lowStock: Array<{
      productId: string;
      sku: string;
      name: string;
      quantity: number;
      reorderPoint: number;
    }> = [];

    for (const p of products) {
      const qty = p.stockLevels.reduce((s, l) => s + l.quantity, 0);
      totalUnits += qty;
      stockValue += qty * p.unitCost;
      if (isLowStock(qty, p.reorderPoint)) {
        lowStock.push({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          quantity: qty,
          reorderPoint: p.reorderPoint,
        });
      }
    }

    return {
      totalSkus: products.length,
      totalUnits,
      stockValue: Math.round(stockValue * 100) / 100,
      lowStock,
    };
  }

  async sales(period: string) {
    const days = period === '30d' ? 30 : period === '1d' ? 1 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await this.prisma.salesOrder.findMany({
      where: { status: 'completed', createdAt: { gte: since } },
      include: { lines: { include: { product: true } } },
    });

    const productMap = new Map<
      string,
      { productId: string; name: string; quantity: number; revenue: number }
    >();
    let revenue = 0;
    let taxCollected = 0;
    for (const o of orders) {
      revenue += o.total;
      taxCollected += o.taxTotal;
      for (const line of o.lines) {
        const cur = productMap.get(line.productId) ?? {
          productId: line.productId,
          name: line.product.name,
          quantity: 0,
          revenue: 0,
        };
        cur.quantity += line.quantity;
        cur.revenue += line.lineTotal;
        productMap.set(line.productId, cur);
      }
    }

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      period,
      orderCount: orders.length,
      revenue: Math.round(revenue * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      topProducts,
    };
  }

  async dashboard() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [todayOrders, products, inventory] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { status: 'completed', createdAt: { gte: start } },
      }),
      this.prisma.product.count(),
      this.inventory(),
    ]);
    return {
      todayRevenue: Math.round(
        todayOrders.reduce((s, o) => s + o.total, 0) * 100,
      ) / 100,
      todayOrders: todayOrders.length,
      lowStockCount: inventory.lowStock.length,
      totalProducts: products,
    };
  }
}

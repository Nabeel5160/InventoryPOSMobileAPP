import {
  calcOrderTotals,
  isLowStock,
  resolveUnitPrice,
  type CreateSalesOrderRequest,
  type DashboardSummary,
  type InventoryReport,
  type LoginResponse,
  type Product,
  type SalesAnalytics,
  type SalesOrder,
  type StockLevel,
  type SyncRequest,
  type SyncResponse,
  type User,
  type Warehouse,
} from '@iq/shared';
import type { ApiClient } from './types';

const now = () => new Date().toISOString();

const users: Array<User & { password: string }> = [
  {
    id: 'u-admin',
    email: 'admin@iqcomputers.local',
    name: 'Admin User',
    role: 'Admin',
    password: 'password123',
  },
  {
    id: 'u-sales',
    email: 'sales@iqcomputers.local',
    name: 'Sales Rep',
    role: 'Sales',
    password: 'password123',
  },
  {
    id: 'u-wh',
    email: 'warehouse@iqcomputers.local',
    name: 'Warehouse Staff',
    role: 'Warehouse',
    password: 'password123',
  },
];

const warehouses: Warehouse[] = [
  { id: 'wh-main', name: 'Main Warehouse', location: 'Karachi HQ' },
  { id: 'wh-show', name: 'Showroom', location: 'Saddar Branch' },
];

let products: Product[] = [
  {
    id: 'p1',
    sku: 'IQ-LAP-001',
    name: 'IQ ProBook 14"',
    description: 'Business laptop',
    barcode: '8901000000011',
    unitCost: 420,
    basePrice: 599,
    taxClass: 'standard',
    taxRate: 0.1,
    reorderPoint: 8,
    priceTiers: [
      { id: 't1', productId: 'p1', minQty: 5, unitPrice: 569, currency: 'USD' },
      { id: 't2', productId: 'p1', minQty: 10, unitPrice: 539, currency: 'USD' },
    ],
    updatedAt: now(),
  },
  {
    id: 'p2',
    sku: 'IQ-MON-027',
    name: '27" IPS Monitor',
    description: 'Wholesale monitor',
    barcode: '8901000000028',
    unitCost: 140,
    basePrice: 219,
    taxClass: 'standard',
    taxRate: 0.1,
    reorderPoint: 10,
    priceTiers: [
      { id: 't3', productId: 'p2', minQty: 5, unitPrice: 199, currency: 'USD' },
    ],
    updatedAt: now(),
  },
  {
    id: 'p3',
    sku: 'IQ-KB-MEC',
    name: 'Mechanical Keyboard',
    description: 'Hot-swap keyboard',
    barcode: '8901000000035',
    unitCost: 28,
    basePrice: 49,
    taxClass: 'standard',
    taxRate: 0.1,
    reorderPoint: 15,
    priceTiers: [
      { id: 't4', productId: 'p3', minQty: 10, unitPrice: 42, currency: 'USD' },
    ],
    updatedAt: now(),
  },
  {
    id: 'p4',
    sku: 'IQ-SSD-1T',
    name: '1TB NVMe SSD',
    description: 'Gen4 SSD',
    barcode: '8901000000042',
    unitCost: 55,
    basePrice: 89,
    taxClass: 'standard',
    taxRate: 0.1,
    reorderPoint: 20,
    priceTiers: [
      { id: 't5', productId: 'p4', minQty: 10, unitPrice: 79, currency: 'USD' },
    ],
    updatedAt: now(),
  },
  {
    id: 'p5',
    sku: 'IQ-RAM-32',
    name: '32GB DDR5 Kit',
    description: 'Dual channel kit',
    barcode: '8901000000059',
    unitCost: 70,
    basePrice: 119,
    taxClass: 'standard',
    taxRate: 0.1,
    reorderPoint: 10,
    priceTiers: [
      { id: 't6', productId: 'p5', minQty: 5, unitPrice: 109, currency: 'USD' },
    ],
    updatedAt: now(),
  },
];

let stock: StockLevel[] = [
  { id: 's1', productId: 'p1', warehouseId: 'wh-main', quantity: 25, updatedAt: now() },
  { id: 's2', productId: 'p2', warehouseId: 'wh-main', quantity: 40, updatedAt: now() },
  { id: 's3', productId: 'p3', warehouseId: 'wh-main', quantity: 12, updatedAt: now() },
  { id: 's4', productId: 'p4', warehouseId: 'wh-main', quantity: 6, updatedAt: now() },
  { id: 's5', productId: 'p5', warehouseId: 'wh-main', quantity: 18, updatedAt: now() },
];

let orders: SalesOrder[] = [];
const tokens = new Map<string, string>();

function requireUser(token: string) {
  const userId = tokens.get(token);
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Unauthorized');
  return user;
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function createMockApi(): ApiClient {
  return {
    async login(email, password) {
      const user = users.find((u) => u.email === email && u.password === password);
      if (!user) throw new Error('Invalid email or password');
      const accessToken = `mock-${user.id}-${Date.now()}`;
      tokens.set(accessToken, user.id);
      return delay({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    },

    async me(token) {
      const user = requireUser(token);
      return delay({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    },

    async listProducts(token, q) {
      requireUser(token);
      const query = (q ?? '').toLowerCase();
      const list = products.filter(
        (p) =>
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.barcode ?? '').includes(query),
      );
      return delay(list);
    },

    async getProduct(token, id) {
      requireUser(token);
      const product = products.find((p) => p.id === id);
      if (!product) throw new Error('Product not found');
      return delay(product);
    },

    async getProductByBarcode(token, code) {
      requireUser(token);
      const product = products.find((p) => p.barcode === code || p.sku === code);
      if (!product) throw new Error('Product not found');
      return delay(product);
    },

    async listWarehouses(token) {
      requireUser(token);
      return delay(warehouses);
    },

    async listStock(token, warehouseId) {
      requireUser(token);
      return delay(
        stock.filter((s) => !warehouseId || s.warehouseId === warehouseId),
      );
    },

    async createSalesOrder(token, body: CreateSalesOrderRequest) {
      const user = requireUser(token);
      if (user.role === 'Warehouse') {
        throw new Error('Role cannot complete sales');
      }
      if (body.clientMutationId) {
        const existing = orders.find(
          (o) => o.clientMutationId === body.clientMutationId,
        );
        if (existing) return delay(existing);
      }

      const priced = body.lines.map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) throw new Error(`Unknown product ${line.productId}`);
        const unitPrice =
          line.unitPrice ?? resolveUnitPrice(product, line.quantity);
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: line.quantity,
          unitPrice,
          taxRate: product.taxRate,
        };
      });

      for (const line of priced) {
        const level = stock.find(
          (s) =>
            s.productId === line.productId &&
            s.warehouseId === body.warehouseId,
        );
        if (!level || level.quantity < line.quantity) {
          throw new Error(`Insufficient stock for ${line.name}`);
        }
      }

      for (const line of priced) {
        const level = stock.find(
          (s) =>
            s.productId === line.productId &&
            s.warehouseId === body.warehouseId,
        )!;
        level.quantity -= line.quantity;
        level.updatedAt = now();
      }

      const totals = calcOrderTotals(priced, body.discountPercent ?? 0);
      const order: SalesOrder = {
        id: `ord-${Date.now()}`,
        customerId: body.customerId,
        warehouseId: body.warehouseId,
        status: 'completed',
        lines: priced.map((l, i) => ({
          id: `ol-${Date.now()}-${i}`,
          ...l,
          lineTotal: l.unitPrice * l.quantity * (1 + l.taxRate),
        })),
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paymentMethod: body.paymentMethod,
        clientMutationId: body.clientMutationId,
        createdAt: now(),
        updatedAt: now(),
      };
      orders = [order, ...orders];
      return delay(order);
    },

    async listSalesOrders(token) {
      requireUser(token);
      return delay(orders);
    },

    async dashboard(token): Promise<DashboardSummary> {
      requireUser(token);
      const report = await this.inventoryReport(token);
      const today = orders.filter((o) =>
        (o.createdAt ?? '').startsWith(new Date().toISOString().slice(0, 10)),
      );
      return {
        todayRevenue: today.reduce((s, o) => s + o.total, 0),
        todayOrders: today.length,
        lowStockCount: report.lowStock.length,
        totalProducts: products.length,
      };
    },

    async inventoryReport(token): Promise<InventoryReport> {
      requireUser(token);
      let totalUnits = 0;
      let stockValue = 0;
      const lowStock = [];
      for (const p of products) {
        const qty = stock
          .filter((s) => s.productId === p.id)
          .reduce((a, s) => a + s.quantity, 0);
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
      return delay({
        totalSkus: products.length,
        totalUnits,
        stockValue,
        lowStock,
      });
    },

    async salesAnalytics(token, period = '7d'): Promise<SalesAnalytics> {
      requireUser(token);
      return delay({
        period,
        orderCount: orders.length,
        revenue: orders.reduce((s, o) => s + o.total, 0),
        taxCollected: orders.reduce((s, o) => s + o.taxTotal, 0),
        topProducts: [],
      });
    },

    async sync(token, body: SyncRequest): Promise<SyncResponse> {
      requireUser(token);
      const applied: string[] = [];
      const conflicts: SyncResponse['conflicts'] = [];
      for (const m of body.mutations) {
        try {
          if (m.type === 'sales_order') {
            await this.createSalesOrder(token, {
              ...(m.payload as CreateSalesOrderRequest),
              clientMutationId: m.clientMutationId,
            });
            applied.push(m.clientMutationId);
          } else if (m.type === 'stock_adjust') {
            const payload = m.payload as {
              productId: string;
              warehouseId: string;
              quantity: number;
            };
            const level = stock.find(
              (s) =>
                s.productId === payload.productId &&
                s.warehouseId === payload.warehouseId,
            );
            if (
              level &&
              level.updatedAt &&
              Date.parse(level.updatedAt) > Date.parse(m.clientUpdatedAt)
            ) {
              conflicts.push({
                clientMutationId: m.clientMutationId,
                entity: 'StockLevel',
                entityId: level.id,
                serverUpdatedAt: level.updatedAt,
                serverPayload: { ...level },
                message: 'Stale stock update',
              });
            } else if (level) {
              level.quantity = payload.quantity;
              level.updatedAt = now();
              applied.push(m.clientMutationId);
            }
          }
        } catch (err) {
          conflicts.push({
            clientMutationId: m.clientMutationId,
            entity: m.type,
            entityId: '',
            serverUpdatedAt: now(),
            serverPayload: {},
            message: err instanceof Error ? err.message : 'Sync failed',
          });
        }
      }
      return delay({ applied, conflicts, serverTime: now() });
    },
  };
}

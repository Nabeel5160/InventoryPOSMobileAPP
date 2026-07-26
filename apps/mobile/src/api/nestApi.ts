import type {
  CreateSalesOrderRequest,
  DashboardSummary,
  InventoryReport,
  LoginResponse,
  Product,
  SalesAnalytics,
  SalesOrder,
  StockLevel,
  SyncRequest,
  SyncResponse,
  Warehouse,
} from '@iq/shared';
import type { ApiClient } from './types';

const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: String(p.id),
    sku: String(p.sku),
    name: String(p.name),
    description: String(p.description ?? ''),
    barcode: (p.barcode as string | null) ?? null,
    unitCost: Number(p.unitCost),
    basePrice: Number(p.basePrice),
    taxClass: String(p.taxClass ?? 'standard'),
    taxRate: Number(p.taxRate ?? 0.1),
    reorderPoint: Number(p.reorderPoint ?? 5),
    priceTiers: Array.isArray(p.priceTiers)
      ? (p.priceTiers as Product['priceTiers'])
      : [],
    updatedAt:
      typeof p.updatedAt === 'string'
        ? p.updatedAt
        : p.updatedAt
          ? new Date(p.updatedAt as string).toISOString()
          : undefined,
  };
}

export function createNestApi(): ApiClient {
  return {
    login(email, password) {
      return request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    me(token) {
      return request<LoginResponse['user']>('/auth/me', { token });
    },
    async listProducts(token, q) {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const rows = await request<Record<string, unknown>[]>(`/products${qs}`, {
        token,
      });
      return rows.map(mapProduct);
    },
    async getProduct(token, id) {
      const row = await request<Record<string, unknown>>(`/products/${id}`, {
        token,
      });
      return mapProduct(row);
    },
    async getProductByBarcode(token, code) {
      const row = await request<Record<string, unknown>>(
        `/products/by-barcode/${encodeURIComponent(code)}`,
        { token },
      );
      return mapProduct(row);
    },
    listWarehouses(token) {
      return request<Warehouse[]>('/warehouses', { token });
    },
    async listStock(token, warehouseId) {
      const qs = warehouseId
        ? `?warehouseId=${encodeURIComponent(warehouseId)}`
        : '';
      const rows = await request<Array<Record<string, unknown>>>(
        `/stock${qs}`,
        { token },
      );
      return rows.map(
        (r): StockLevel => ({
          id: String(r.id),
          productId: String(r.productId),
          warehouseId: String(r.warehouseId),
          quantity: Number(r.quantity),
          updatedAt: r.updatedAt
            ? new Date(r.updatedAt as string).toISOString()
            : undefined,
        }),
      );
    },
    createSalesOrder(token, body: CreateSalesOrderRequest) {
      return request<SalesOrder>('/orders/sales', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
    },
    listSalesOrders(token) {
      return request<SalesOrder[]>('/orders/sales', { token });
    },
    dashboard(token) {
      return request<DashboardSummary>('/dashboard', { token });
    },
    inventoryReport(token) {
      return request<InventoryReport>('/reports/inventory', { token });
    },
    salesAnalytics(token, period = '7d') {
      return request<SalesAnalytics>(
        `/analytics/sales?period=${encodeURIComponent(period)}`,
        { token },
      );
    },
    sync(token, body: SyncRequest) {
      return request<SyncResponse>('/sync', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
    },
  };
}

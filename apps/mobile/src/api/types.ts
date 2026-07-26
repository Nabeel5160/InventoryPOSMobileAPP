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

export interface ApiClient {
  login(email: string, password: string): Promise<LoginResponse>;
  me(token: string): Promise<LoginResponse['user']>;
  listProducts(token: string, q?: string): Promise<Product[]>;
  getProduct(token: string, id: string): Promise<Product>;
  getProductByBarcode(token: string, code: string): Promise<Product>;
  listWarehouses(token: string): Promise<Warehouse[]>;
  listStock(token: string, warehouseId?: string): Promise<StockLevel[]>;
  createSalesOrder(
    token: string,
    body: CreateSalesOrderRequest,
  ): Promise<SalesOrder>;
  listSalesOrders(token: string): Promise<SalesOrder[]>;
  dashboard(token: string): Promise<DashboardSummary>;
  inventoryReport(token: string): Promise<InventoryReport>;
  salesAnalytics(token: string, period?: string): Promise<SalesAnalytics>;
  sync(token: string, body: SyncRequest): Promise<SyncResponse>;
}

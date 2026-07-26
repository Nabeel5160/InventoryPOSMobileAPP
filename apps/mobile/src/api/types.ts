import type {
  CreatePurchaseOrderRequest,
  CreateSalesOrderRequest,
  DashboardSummary,
  InventoryReport,
  LoginResponse,
  Product,
  PurchaseOrder,
  ReceivePurchaseOrderRequest,
  SalesAnalytics,
  SalesOrder,
  StockLevel,
  Supplier,
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
  listSuppliers(token: string): Promise<Supplier[]>;
  listPurchaseOrders(token: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(token: string, id: string): Promise<PurchaseOrder>;
  createPurchaseOrder(
    token: string,
    body: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrder>;
  receivePurchaseOrder(
    token: string,
    id: string,
    body: ReceivePurchaseOrderRequest,
  ): Promise<PurchaseOrder>;
}

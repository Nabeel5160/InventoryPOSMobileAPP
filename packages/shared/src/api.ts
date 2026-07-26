import { z } from 'zod';
import { PaymentMethodSchema, SalesOrderLineSchema } from './models';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['Admin', 'Manager', 'Sales', 'Warehouse']),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const CreateSalesOrderRequestSchema = z.object({
  customerId: z.string().nullable().optional(),
  warehouseId: z.string(),
  lines: z.array(
    SalesOrderLineSchema.omit({ id: true, lineTotal: true }).extend({
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative().optional(),
    }),
  ),
  paymentMethod: PaymentMethodSchema,
  discountPercent: z.number().min(0).max(100).optional().default(0),
  clientMutationId: z.string().optional(),
});
export type CreateSalesOrderRequest = z.infer<
  typeof CreateSalesOrderRequestSchema
>;

export const SyncMutationSchema = z.object({
  clientMutationId: z.string(),
  type: z.enum(['sales_order', 'stock_adjust']),
  payload: z.record(z.unknown()),
  clientUpdatedAt: z.string().datetime(),
});
export type SyncMutation = z.infer<typeof SyncMutationSchema>;

export const SyncRequestSchema = z.object({
  mutations: z.array(SyncMutationSchema),
  lastSyncedAt: z.string().datetime().optional(),
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export const SyncConflictSchema = z.object({
  clientMutationId: z.string(),
  entity: z.string(),
  entityId: z.string(),
  serverUpdatedAt: z.string().datetime(),
  serverPayload: z.record(z.unknown()),
  message: z.string(),
});
export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export const SyncResponseSchema = z.object({
  applied: z.array(z.string()),
  conflicts: z.array(SyncConflictSchema),
  serverTime: z.string().datetime(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const InventoryReportSchema = z.object({
  totalSkus: z.number(),
  totalUnits: z.number(),
  stockValue: z.number(),
  lowStock: z.array(
    z.object({
      productId: z.string(),
      sku: z.string(),
      name: z.string(),
      quantity: z.number(),
      reorderPoint: z.number(),
    }),
  ),
});
export type InventoryReport = z.infer<typeof InventoryReportSchema>;

export const SalesAnalyticsSchema = z.object({
  period: z.string(),
  orderCount: z.number(),
  revenue: z.number(),
  taxCollected: z.number(),
  topProducts: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number(),
      revenue: z.number(),
    }),
  ),
});
export type SalesAnalytics = z.infer<typeof SalesAnalyticsSchema>;

export const DashboardSummarySchema = z.object({
  todayRevenue: z.number(),
  todayOrders: z.number(),
  lowStockCount: z.number(),
  totalProducts: z.number(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

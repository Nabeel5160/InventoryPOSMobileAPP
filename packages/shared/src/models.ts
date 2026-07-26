import { z } from 'zod';
import { UserRoleSchema } from './roles';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  firebaseUid: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WarehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
});
export type Warehouse = z.infer<typeof WarehouseSchema>;

export const PriceTierSchema = z.object({
  id: z.string(),
  productId: z.string(),
  minQty: z.number().int().min(1),
  unitPrice: z.number().nonnegative(),
  currency: z.string().default('USD'),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  barcode: z.string().optional().nullable(),
  unitCost: z.number().nonnegative(),
  basePrice: z.number().nonnegative(),
  taxClass: z.string().default('standard'),
  taxRate: z.number().min(0).max(1).default(0.1),
  reorderPoint: z.number().int().nonnegative().default(5),
  priceTiers: z.array(PriceTierSchema).default([]),
  updatedAt: z.string().datetime().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const StockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int(),
  updatedAt: z.string().datetime().optional(),
});
export type StockLevel = z.infer<typeof StockLevelSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  priceTierLabel: z.string().optional().default('default'),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const PaymentMethodSchema = z.enum(['cash', 'terminal']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SalesOrderLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  sku: z.string().optional(),
  name: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1).default(0.1),
  lineTotal: z.number().nonnegative().optional(),
});
export type SalesOrderLine = z.infer<typeof SalesOrderLineSchema>;

export const SalesOrderStatusSchema = z.enum([
  'draft',
  'completed',
  'cancelled',
]);
export type SalesOrderStatus = z.infer<typeof SalesOrderStatusSchema>;

export const SalesOrderSchema = z.object({
  id: z.string(),
  customerId: z.string().nullable().optional(),
  warehouseId: z.string(),
  status: SalesOrderStatusSchema,
  lines: z.array(SalesOrderLineSchema),
  subtotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  paymentMethod: PaymentMethodSchema.optional(),
  clientMutationId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SalesOrder = z.infer<typeof SalesOrderSchema>;

export const PaymentRecordSchema = z.object({
  id: z.string(),
  salesOrderId: z.string(),
  method: PaymentMethodSchema,
  amount: z.number().nonnegative(),
  createdAt: z.string().datetime().optional(),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  actionType: z.string(),
  entity: z.string(),
  entityId: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

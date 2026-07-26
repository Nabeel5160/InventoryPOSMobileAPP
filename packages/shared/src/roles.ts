import { z } from 'zod';

export const UserRoleSchema = z.enum(['Admin', 'Manager', 'Sales', 'Warehouse']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    canCompleteSales: boolean;
    canEditCost: boolean;
    canAdjustStock: boolean;
    canManageUsers: boolean;
  }
> = {
  Admin: {
    canCompleteSales: true,
    canEditCost: true,
    canAdjustStock: true,
    canManageUsers: true,
  },
  Manager: {
    canCompleteSales: true,
    canEditCost: true,
    canAdjustStock: true,
    canManageUsers: false,
  },
  Sales: {
    canCompleteSales: true,
    canEditCost: false,
    canAdjustStock: false,
    canManageUsers: false,
  },
  Warehouse: {
    canCompleteSales: false,
    canEditCost: false,
    canAdjustStock: true,
    canManageUsers: false,
  },
};

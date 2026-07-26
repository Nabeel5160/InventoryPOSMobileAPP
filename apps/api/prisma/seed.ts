import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentRecord.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.syncOutbox.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@iqcomputers.local',
        name: 'Admin User',
        role: UserRole.Admin,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sales@iqcomputers.local',
        name: 'Sales Rep',
        role: UserRole.Sales,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: 'warehouse@iqcomputers.local',
        name: 'Warehouse Staff',
        role: UserRole.Warehouse,
        passwordHash,
      },
    }),
  ]);

  const mainWh = await prisma.warehouse.create({
    data: { name: 'Main Warehouse', location: 'Karachi HQ' },
  });
  await prisma.warehouse.create({
    data: { name: 'Showroom', location: 'Saddar Branch' },
  });

  const catalog = [
    {
      sku: 'IQ-LAP-001',
      name: 'IQ ProBook 14"',
      barcode: '8901000000011',
      unitCost: 420,
      basePrice: 599,
      reorderPoint: 8,
      qty: 25,
      tiers: [
        { minQty: 5, unitPrice: 569 },
        { minQty: 10, unitPrice: 539 },
      ],
    },
    {
      sku: 'IQ-MON-027',
      name: '27" IPS Monitor',
      barcode: '8901000000028',
      unitCost: 140,
      basePrice: 219,
      reorderPoint: 10,
      qty: 40,
      tiers: [{ minQty: 5, unitPrice: 199 }],
    },
    {
      sku: 'IQ-KB-MEC',
      name: 'Mechanical Keyboard',
      barcode: '8901000000035',
      unitCost: 28,
      basePrice: 49,
      reorderPoint: 15,
      qty: 12,
      tiers: [{ minQty: 10, unitPrice: 42 }],
    },
    {
      sku: 'IQ-SSD-1T',
      name: '1TB NVMe SSD',
      barcode: '8901000000042',
      unitCost: 55,
      basePrice: 89,
      reorderPoint: 20,
      qty: 6,
      tiers: [{ minQty: 10, unitPrice: 79 }],
    },
    {
      sku: 'IQ-RAM-32',
      name: '32GB DDR5 Kit',
      barcode: '8901000000059',
      unitCost: 70,
      basePrice: 119,
      reorderPoint: 10,
      qty: 18,
      tiers: [{ minQty: 5, unitPrice: 109 }],
    },
  ];

  for (const item of catalog) {
    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        description: `${item.name} — IQ Computers wholesale`,
        barcode: item.barcode,
        unitCost: item.unitCost,
        basePrice: item.basePrice,
        taxRate: 0.1,
        reorderPoint: item.reorderPoint,
        priceTiers: {
          create: item.tiers.map((t) => ({
            minQty: t.minQty,
            unitPrice: t.unitPrice,
            currency: 'USD',
          })),
        },
        stockLevels: {
          create: {
            warehouseId: mainWh.id,
            quantity: item.qty,
          },
        },
      },
    });
    console.log(`Seeded product ${product.sku}`);
  }

  await prisma.customer.create({
    data: {
      name: 'TechMart Wholesale',
      email: 'orders@techmart.example',
      phone: '+92-300-0000000',
      priceTierLabel: 'wholesale',
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Asia Component Traders',
      contactInfo: 'Procurement desk',
      email: 'sales@asiacomponents.example',
      phone: '+92-21-111000111',
      leadTimeDays: 5,
      defaultCurrency: 'USD',
    },
  });
  await prisma.supplier.create({
    data: {
      name: 'Global Silicon Hub',
      contactInfo: 'B2B orders',
      email: 'b2b@globalsilicon.example',
      leadTimeDays: 10,
      defaultCurrency: 'USD',
    },
  });

  const firstProduct = await prisma.product.findFirst();
  if (firstProduct) {
    await prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        warehouseId: mainWh.id,
        status: 'ordered',
        notes: 'Seed open PO for SSD restock',
        lines: {
          create: [
            {
              productId: firstProduct.id,
              quantity: 20,
              receivedQty: 0,
              unitCost: firstProduct.unitCost,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete. Demo users (password: password123):');
  for (const u of users) {
    console.log(`  ${u.email} (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

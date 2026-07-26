import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePurchaseOrderRequestSchema,
  ReceivePurchaseOrderRequestSchema,
} from '@iq/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  listSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  listPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        warehouse: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  getPurchaseOrder(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        lines: { include: { product: true } },
      },
    });
  }

  async createPurchaseOrder(body: unknown, userId: string) {
    const parsed = CreatePurchaseOrderRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    if (!data.lines.length) {
      throw new BadRequestException('At least one line is required');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier) throw new BadRequestException('Unknown supplier');

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) throw new BadRequestException('Unknown warehouse');

    const products = await this.prisma.product.findMany({
      where: { id: { in: data.lines.map((l) => l.productId) } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const line of data.lines) {
      if (!byId.has(line.productId)) {
        throw new BadRequestException(`Unknown product ${line.productId}`);
      }
    }

    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        status: 'ordered',
        notes: data.notes ?? null,
        lines: {
          create: data.lines.map((line) => {
            const product = byId.get(line.productId)!;
            return {
              productId: line.productId,
              quantity: line.quantity,
              receivedQty: 0,
              unitCost: line.unitCost ?? product.unitCost,
            };
          }),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        lines: { include: { product: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        actionType: 'po.create',
        entity: 'PurchaseOrder',
        entityId: po.id,
        details: { supplierId: data.supplierId, lines: data.lines.length },
      },
    });

    return po;
  }

  async receivePurchaseOrder(id: string, body: unknown, userId: string) {
    const parsed = ReceivePurchaseOrderRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'cancelled' || po.status === 'received') {
      throw new BadRequestException(`Cannot receive PO in status ${po.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const recv of parsed.data.lines) {
        const line = po.lines.find((l) => l.productId === recv.productId);
        if (!line) {
          throw new BadRequestException(
            `Product ${recv.productId} is not on this PO`,
          );
        }
        const remaining = line.quantity - line.receivedQty;
        if (recv.quantity > remaining) {
          throw new BadRequestException(
            `Cannot receive ${recv.quantity}; only ${remaining} remaining for ${recv.productId}`,
          );
        }

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQty: line.receivedQty + recv.quantity },
        });

        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: {
              productId: recv.productId,
              warehouseId: po.warehouseId,
            },
          },
          create: {
            productId: recv.productId,
            warehouseId: po.warehouseId,
            quantity: recv.quantity,
          },
          update: { quantity: { increment: recv.quantity } },
        });
      }

      const fresh = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: {
          supplier: true,
          warehouse: true,
          lines: { include: { product: true } },
        },
      });

      const allReceived = fresh.lines.every(
        (l) => l.receivedQty >= l.quantity,
      );
      const anyReceived = fresh.lines.some((l) => l.receivedQty > 0);
      const status = allReceived
        ? 'received'
        : anyReceived
          ? 'partial'
          : fresh.status;

      return tx.purchaseOrder.update({
        where: { id },
        data: { status },
        include: {
          supplier: true,
          warehouse: true,
          lines: { include: { product: true } },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        actionType: 'po.receive',
        entity: 'PurchaseOrder',
        entityId: id,
        details: { lines: parsed.data.lines, status: updated.status },
      },
    });

    return updated;
  }
}

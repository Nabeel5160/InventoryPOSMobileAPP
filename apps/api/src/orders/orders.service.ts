import {
  BadRequestException,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import {
  CreateSalesOrderRequestSchema,
  calcOrderTotals,
  resolveUnitPrice,
} from '@iq/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.salesOrder.findMany({
      include: { lines: true, payment: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  findById(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } }, payment: true },
    });
  }

  async create(body: unknown, userId: string) {
    const parsed = CreateSalesOrderRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;

    if (data.clientMutationId) {
      const existing = await this.prisma.salesOrder.findUnique({
        where: { clientMutationId: data.clientMutationId },
        include: { lines: true, payment: true },
      });
      if (existing) return existing;
    }

    const productIds = data.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { priceTiers: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const pricedLines = data.lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) {
        throw new BadRequestException(`Unknown product ${line.productId}`);
      }
      const unitPrice =
        line.unitPrice ??
        resolveUnitPrice(
          {
            basePrice: product.basePrice,
            priceTiers: product.priceTiers.map((t) => ({
              id: t.id,
              productId: t.productId,
              minQty: t.minQty,
              unitPrice: t.unitPrice,
              currency: t.currency,
            })),
          },
          line.quantity,
        );
      const taxRate = product.taxRate;
      return {
        productId: product.id,
        quantity: line.quantity,
        unitPrice,
        taxRate,
      };
    });

    const totals = calcOrderTotals(pricedLines, data.discountPercent ?? 0);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        for (const line of pricedLines) {
          const stock = await tx.stockLevel.findUnique({
            where: {
              productId_warehouseId: {
                productId: line.productId,
                warehouseId: data.warehouseId,
              },
            },
          });
          if (!stock || stock.quantity < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${line.productId}`,
            );
          }
          await tx.stockLevel.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - line.quantity },
          });
        }

        const created = await tx.salesOrder.create({
          data: {
            customerId: data.customerId ?? null,
            warehouseId: data.warehouseId,
            status: 'completed',
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            paymentMethod: data.paymentMethod,
            clientMutationId: data.clientMutationId,
            lines: {
              create: pricedLines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxRate: line.taxRate,
                lineTotal:
                  line.unitPrice *
                  line.quantity *
                  (1 - (data.discountPercent ?? 0) / 100) *
                  (1 + line.taxRate),
              })),
            },
            payment: {
              create: {
                method: data.paymentMethod,
                amount: totals.total,
              },
            },
          },
          include: { lines: true, payment: true },
        });

        await tx.auditLog.create({
          data: {
            userId,
            actionType: 'sales.complete',
            entity: 'SalesOrder',
            entityId: created.id,
            details: { total: created.total, method: data.paymentMethod },
          },
        });

        if (data.clientMutationId) {
          await tx.syncOutbox.create({
            data: {
              clientMutationId: data.clientMutationId,
              type: 'sales_order',
              payload: { orderId: created.id },
            },
          });
        }

        return created;
      });

      return order;
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('Unique constraint') &&
        data.clientMutationId
      ) {
        const existing = await this.prisma.salesOrder.findUnique({
          where: { clientMutationId: data.clientMutationId },
          include: { lines: true, payment: true },
        });
        if (existing) return existing;
        throw new ConflictException('Duplicate mutation');
      }
      throw err;
    }
  }
}

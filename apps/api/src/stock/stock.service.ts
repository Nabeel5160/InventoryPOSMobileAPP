import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  listWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  }

  listStock(warehouseId?: string) {
    return this.prisma.stockLevel.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { product: true, warehouse: true },
    });
  }

  async adjust(
    body: {
      productId: string;
      warehouseId: string;
      quantity: number;
      clientUpdatedAt?: string;
    },
    userId: string,
  ) {
    if (
      !body.productId ||
      !body.warehouseId ||
      typeof body.quantity !== 'number'
    ) {
      throw new BadRequestException('Invalid stock adjust payload');
    }

    const existing = await this.prisma.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: body.productId,
          warehouseId: body.warehouseId,
        },
      },
    });

    if (
      existing &&
      body.clientUpdatedAt &&
      existing.updatedAt > new Date(body.clientUpdatedAt)
    ) {
      throw new ConflictException({
        message: 'Stale stock update',
        serverUpdatedAt: existing.updatedAt.toISOString(),
        serverPayload: existing,
      });
    }

    const stock = await this.prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: body.productId,
          warehouseId: body.warehouseId,
        },
      },
      create: {
        productId: body.productId,
        warehouseId: body.warehouseId,
        quantity: body.quantity,
      },
      update: { quantity: body.quantity },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        actionType: 'stock.adjust',
        entity: 'StockLevel',
        entityId: stock.id,
        details: {
          productId: body.productId,
          warehouseId: body.warehouseId,
          quantity: body.quantity,
        },
      },
    });

    return stock;
  }
}

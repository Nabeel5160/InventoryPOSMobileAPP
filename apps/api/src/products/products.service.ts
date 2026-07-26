import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const CreateProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  barcode: z.string().optional().nullable(),
  unitCost: z.number().nonnegative(),
  basePrice: z.number().nonnegative(),
  taxClass: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string) {
    return this.prisma.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { priceTiers: true, stockLevels: true },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { priceTiers: true, stockLevels: true },
    });
  }

  findByBarcode(code: string) {
    return this.prisma.product.findFirst({
      where: { OR: [{ barcode: code }, { sku: code }] },
      include: { priceTiers: true, stockLevels: true },
    });
  }

  async create(body: unknown, userId: string) {
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const product = await this.prisma.product.create({
      data: {
        ...parsed.data,
        description: parsed.data.description ?? '',
      },
      include: { priceTiers: true, stockLevels: true },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        actionType: 'product.create',
        entity: 'Product',
        entityId: product.id,
        details: { sku: product.sku },
      },
    });
    return product;
  }
}

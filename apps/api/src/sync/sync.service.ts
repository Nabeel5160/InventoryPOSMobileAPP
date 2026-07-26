import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { SyncRequestSchema, SyncConflict } from '@iq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { StockService } from '../stock/stock.service';
import { AuthUser } from '../auth/auth.guards';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly stock: StockService,
  ) {}

  async apply(body: unknown, user: AuthUser) {
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const applied: string[] = [];
    const conflicts: SyncConflict[] = [];

    for (const mutation of parsed.data.mutations) {
      const already = await this.prisma.syncOutbox.findUnique({
        where: { clientMutationId: mutation.clientMutationId },
      });
      if (already) {
        applied.push(mutation.clientMutationId);
        continue;
      }

      try {
        if (mutation.type === 'sales_order') {
          await this.orders.create(
            {
              ...mutation.payload,
              clientMutationId: mutation.clientMutationId,
            },
            user.id,
          );
          applied.push(mutation.clientMutationId);
        } else if (mutation.type === 'stock_adjust') {
          const payload = mutation.payload as {
            productId: string;
            warehouseId: string;
            quantity: number;
          };
          await this.stock.adjust(
            {
              ...payload,
              clientUpdatedAt: mutation.clientUpdatedAt,
            },
            user.id,
          );
          await this.prisma.syncOutbox.create({
            data: {
              clientMutationId: mutation.clientMutationId,
              type: mutation.type,
              payload: mutation.payload as object,
            },
          });
          applied.push(mutation.clientMutationId);
        }
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 409) {
          const response = err.getResponse();
          const payload =
            typeof response === 'object' && response !== null
              ? (response as Record<string, unknown>)
              : {};
          const serverPayload =
            (payload['serverPayload'] as Record<string, unknown> | undefined) ??
            {};
          const entityId =
            typeof serverPayload['id'] === 'string' ? serverPayload['id'] : '';
          conflicts.push({
            clientMutationId: mutation.clientMutationId,
            entity: 'StockLevel',
            entityId,
            serverUpdatedAt: String(
              payload['serverUpdatedAt'] ?? new Date().toISOString(),
            ),
            serverPayload,
            message: String(payload['message'] ?? 'Conflict'),
          });
        } else {
          conflicts.push({
            clientMutationId: mutation.clientMutationId,
            entity: mutation.type,
            entityId: '',
            serverUpdatedAt: new Date().toISOString(),
            serverPayload: {},
            message: err instanceof Error ? err.message : 'Sync failed',
          });
        }
      }
    }

    return {
      applied,
      conflicts,
      serverTime: new Date().toISOString(),
    };
  }
}

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import {
  AuthGuard,
  AuthUser,
  CanAdjustStockGuard,
} from '../auth/auth.guards';

@Controller()
@UseGuards(AuthGuard)
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get('suppliers')
  listSuppliers() {
    return this.purchasing.listSuppliers();
  }

  @Get('orders/purchase')
  listPurchaseOrders() {
    return this.purchasing.listPurchaseOrders();
  }

  @Get('orders/purchase/:id')
  async getPurchaseOrder(@Param('id') id: string) {
    const po = await this.purchasing.getPurchaseOrder(id);
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  @Post('orders/purchase')
  @UseGuards(CanAdjustStockGuard)
  createPurchaseOrder(@Body() body: unknown, @Req() req: { user: AuthUser }) {
    return this.purchasing.createPurchaseOrder(body, req.user.id);
  }

  @Post('orders/purchase/:id/receive')
  @UseGuards(CanAdjustStockGuard)
  receive(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { user: AuthUser },
  ) {
    return this.purchasing.receivePurchaseOrder(id, body, req.user.id);
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import {
  AuthGuard,
  AuthUser,
  CanAdjustStockGuard,
} from '../auth/auth.guards';

@Controller()
@UseGuards(AuthGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('warehouses')
  warehouses() {
    return this.stock.listWarehouses();
  }

  @Get('stock')
  stockLevels(@Query('warehouseId') warehouseId?: string) {
    return this.stock.listStock(warehouseId);
  }

  @Post('stock/adjust')
  @UseGuards(CanAdjustStockGuard)
  adjust(
    @Body()
    body: {
      productId: string;
      warehouseId: string;
      quantity: number;
      clientUpdatedAt?: string;
    },
    @Req() req: { user: AuthUser },
  ) {
    return this.stock.adjust(body, req.user.id);
  }
}

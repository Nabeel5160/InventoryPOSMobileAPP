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
import { OrdersService } from './orders.service';
import {
  AuthGuard,
  AuthUser,
  CanCompleteSalesGuard,
} from '../auth/auth.guards';

@Controller('orders/sales')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.list();
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @Post()
  @UseGuards(CanCompleteSalesGuard)
  create(@Body() body: unknown, @Req() req: { user: AuthUser }) {
    return this.orders.create(body, req.user.id);
  }
}

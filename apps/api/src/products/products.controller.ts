import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard, CanEditCostGuard } from '../auth/auth.guards';
import { AuthUser } from '../auth/auth.guards';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.products.list(q);
  }

  @Get('by-barcode/:code')
  async byBarcode(@Param('code') code: string) {
    const product = await this.products.findByBarcode(code);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Post()
  @UseGuards(CanEditCostGuard)
  create(@Body() body: unknown, @Req() req: { user: AuthUser }) {
    return this.products.create(body, req.user.id);
  }
}

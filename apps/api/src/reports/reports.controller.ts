import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guards';

@Controller()
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports/inventory')
  inventory() {
    return this.reports.inventory();
  }

  @Get('analytics/sales')
  sales(@Query('period') period?: string) {
    return this.reports.sales(period ?? '7d');
  }

  @Get('dashboard')
  dashboard() {
    return this.reports.dashboard();
  }
}

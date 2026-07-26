import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { AuthGuard, AuthUser } from '../auth/auth.guards';

@Controller('sync')
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  apply(@Body() body: unknown, @Req() req: { user: AuthUser }) {
    return this.syncService.apply(body, req.user);
  }
}

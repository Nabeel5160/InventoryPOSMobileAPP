import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, AuthUser } from './auth.guards';
import { LoginRequestSchema } from '@iq/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid credentials payload');
    }
    return this.auth.login(parsed.data.email, parsed.data.password);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: { user: AuthUser }) {
    return req.user;
  }
}

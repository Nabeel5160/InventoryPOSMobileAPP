import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AuthGuard,
  CanAdjustStockGuard,
  CanCompleteSalesGuard,
  CanEditCostGuard,
} from './auth.guards';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    CanCompleteSalesGuard,
    CanEditCostGuard,
    CanAdjustStockGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    JwtModule,
    CanCompleteSalesGuard,
    CanEditCostGuard,
    CanAdjustStockGuard,
  ],
})
export class AuthModule {}

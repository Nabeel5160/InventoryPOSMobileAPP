import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLE_PERMISSIONS, UserRole } from '@iq/shared';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly firebase: FirebaseService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice(7);
    let user: AuthUser | null = null;

    // Prefer Firebase ID token when configured
    const decoded = await this.firebase.verifyIdToken(token);
    if (decoded) {
      const dbUser = await this.prisma.user.upsert({
        where: { firebaseUid: decoded.uid },
        update: { email: decoded.email ?? undefined },
        create: {
          firebaseUid: decoded.uid,
          email: decoded.email ?? `${decoded.uid}@firebase.local`,
          name: decoded.name ?? decoded.email ?? 'Firebase User',
          role: 'Sales',
        },
      });
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as UserRole,
      };
    } else {
      try {
        const payload = await this.jwt.verifyAsync<{
          sub: string;
          email: string;
          name: string;
          role: UserRole;
        }>(token);
        user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
        };
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }

    req.user = user;

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

@Injectable()
export class CanCompleteSalesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!ROLE_PERMISSIONS[user.role].canCompleteSales) {
      throw new ForbiddenException('Role cannot complete sales');
    }
    return true;
  }
}

@Injectable()
export class CanEditCostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!ROLE_PERMISSIONS[user.role].canEditCost) {
      throw new ForbiddenException('Role cannot edit cost fields');
    }
    return true;
  }
}

@Injectable()
export class CanAdjustStockGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!ROLE_PERMISSIONS[user.role].canAdjustStock) {
      throw new ForbiddenException('Role cannot adjust stock');
    }
    return true;
  }
}

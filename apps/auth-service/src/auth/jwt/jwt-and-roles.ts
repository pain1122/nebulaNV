import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAndRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly rolesGuard: RolesGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 0) If this is a gRPC/RPC context, skip this global guard entirely.
    if (context.getType() === 'rpc') {
      return true;
    }
    // Check if route or controller is public (has @Public())
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // skip auth/roles if public route

    // Otherwise, check JWT authentication first
    const jwtResult = await this.jwtAuthGuard.canActivate(context);
    if (!jwtResult) return false;

    // Then check roles authorization
    return this.rolesGuard.canActivate(context);
  }
}

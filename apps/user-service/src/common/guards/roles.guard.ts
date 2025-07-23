import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      // 🔒 Explicit failure — no metadata found
      const handlerName = context.getHandler().name;
      const className = context.getClass().name;
      this.logger.warn(
        `Missing @Roles() metadata on ${className}.${handlerName}`,
      );

      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Missing role metadata for access check');
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    // DEBUG FALLBACK
    throw new ForbiddenException({
      message: 'Forbidden — roles do not match',
      requiredRoles,
      actualRole: user?.role,
      user,
    });
  }
}

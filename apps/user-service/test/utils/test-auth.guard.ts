// apps/user-service/test/utils/test-auth.guard.ts
import 'reflect-metadata';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  INTERNAL_ONLY_KEY,
  REQUIRE_USER_ID_KEY,
  ROLES_METADATA_KEY,
} from '@nebula/grpc-auth';

@Injectable()
export class TestBypassGrpcAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const args = context.getArgs?.() ?? [];
    const meta = args[1] as any;  // gRPC Metadata
    const call = args[2] as any;

    // Read controller metadata
    const internalOnly  = Reflect.getMetadata(INTERNAL_ONLY_KEY,  handler) as boolean | undefined;
    const requireUserId = Reflect.getMetadata(REQUIRE_USER_ID_KEY, handler) as boolean | undefined;
    const requiredRoles = Reflect.getMetadata(ROLES_METADATA_KEY,  handler) as string[] | undefined;

    // Pull “headers” out of test metadata
    const xuid  = meta?.get?.('x-user-id')?.[0]  as string | undefined;
    const xrole = (meta?.get?.('x-user-role')?.[0] as string | undefined) ?? 'user';
    const xsvc  = meta?.get?.('x-svc')?.[0]      as string | undefined;
    const xgw   = meta?.get?.('x-gateway-sign')?.[0] as string | undefined;

    // Simulate InternalOnly() → require x-svc or x-gateway-sign
    if (internalOnly && !xsvc && !xgw) return false;

    // Simulate @RequireUserId()
    if (requireUserId && !xuid) return false;

    // Simulate @Roles(...)
    if (requiredRoles?.length) {
      if (!xrole || !requiredRoles.includes(xrole)) return false;
    }

    // Attach a ctx user so controller code (assertSelfOrAdmin) can work
    if (xuid) {
      const user = { userId: xuid, role: xrole };
      if (call) call.user = user;
      if (meta) (meta as any).user = user;
    }
    return true;
  }
}

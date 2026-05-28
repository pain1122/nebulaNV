// apps/user-service/src/common/decorators/req-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '@nebula/grpc-auth';

export type ReqUser = {
  userId: string;
  email: string;
  role: Role;
};

interface AuthenticatedRequest extends Request {
  user?: ReqUser;
}

// ✅ export this for tests
export const reqUserFactory = (
  _data: unknown,
  ctx: ExecutionContext,
): ReqUser => {
  const http = ctx.switchToHttp();
  if (http?.getRequest) {
    const req = http.getRequest<AuthenticatedRequest>();
    if (req?.user) return req.user;
  }

  type RpcContextWithUser = {
    user?: ReqUser;
  };

  const rpcCtx: RpcContextWithUser = ctx.switchToRpc().getContext?.() ?? {};
  if (rpcCtx.user) return rpcCtx.user;

  return { userId: '', email: '', role: 'user' };
};

// actual decorator used by controllers
export const ReqUser = createParamDecorator(reqUserFactory);

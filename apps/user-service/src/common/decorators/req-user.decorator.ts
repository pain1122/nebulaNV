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

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqUser => {
    const http = ctx.switchToHttp();
    if (http?.getRequest) {
      const req = http.getRequest<AuthenticatedRequest>();
      if (req?.user) return req.user;
    }

    const rpcCtx: any = ctx.switchToRpc().getContext?.() ?? {};
    if (rpcCtx?.user) return rpcCtx.user as ReqUser;
    return { userId: '', email: '', role: 'user' };
  },
);

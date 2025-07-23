import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class GrpcJwtAuthGuard extends AuthGuard('jwt') {
  // Override to extract the gRPC metadata instead of HTTP headers
  getRequest(context: ExecutionContext) {
    const rpcCtx = context.switchToRpc();
    const metadata = rpcCtx.getContext() as Metadata;

    // passport‑jwt expects `req.headers.authorization`
    return {
      headers: {
        authorization: metadata.get('authorization')[0] as string,
      },
    };
  }
}

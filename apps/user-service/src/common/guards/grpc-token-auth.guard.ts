// src/common/guards/grpc-token-auth.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    OnModuleInit,
    Inject,
  } from '@nestjs/common';
  import { ClientGrpc } from '@nestjs/microservices';
  import { firstValueFrom, Observable } from 'rxjs';
  import { Metadata } from '@grpc/grpc-js';
  
  import {
    ValidateTokenRequest,
    ValidateTokenResponse,
  } from '@nebula/protos/auth';
  
  // only declare the methods you need as returning Observables
  interface AuthGrpc {
    validateToken(
      req: ValidateTokenRequest,
      meta?: Metadata
    ): Observable<ValidateTokenResponse>;
  }
  
  @Injectable()
  export class GrpcTokenAuthGuard implements CanActivate, OnModuleInit {
    private auth!: AuthGrpc;
  
    constructor(
      @Inject('AUTH_SERVICE')
      private readonly client: ClientGrpc,
    ) {}
  
    onModuleInit() {
      this.auth = this.client.getService<AuthGrpc>('AuthService');
    }
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      const header = (req.headers['authorization'] as string) || '';
      if (!header.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing Bearer token');
      }
      const token = header.slice(7);
      const meta = new Metadata();
      // call the Observable-returning RPC
      const grpc$ = this.auth.validateToken({ token }, meta);
      const { isValid, userId, email, role } =
        await firstValueFrom(grpc$);
  
      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      // attach user for @Roles() guard down the line
      req.user = { userId, email, role };
      return true;
    }
  }
  
// apps/user-service/test/req-user.decorator.spec.ts
import { describe, it, expect } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import { reqUserFactory } from '../src/common/decorators/req-user.decorator';

const call = (ctx: Partial<ExecutionContext>) => reqUserFactory(undefined, ctx as ExecutionContext);

describe('ReqUser decorator', () => {
  it('returns req.user from HTTP', () => {
    const user = { userId: 'u1', email: 'u1@example.com', role: 'user' as const };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      switchToRpc: () => ({ getContext: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(call(ctx)).toEqual(user);
  });

  it('returns user from RPC context', () => {
    const user = { userId: 'u2', email: 'u2@example.com', role: 'admin' as const };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      switchToRpc: () => ({ getContext: () => ({ user }) }),
    } as unknown as ExecutionContext;

    expect(call(ctx)).toEqual(user);
  });

  it('falls back to default when absent', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      switchToRpc: () => ({ getContext: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(call(ctx)).toEqual({ userId: '', email: '', role: 'user' });
  });
});

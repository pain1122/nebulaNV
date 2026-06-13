import type { Metadata } from '@grpc/grpc-js';
import type { Role } from '@nebula/grpc-auth';
import type { Request } from 'express';

export type AuthRole = Role;

export const AUTH_ROLES: readonly AuthRole[] = ['user', 'admin', 'root-admin'];

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && AUTH_ROLES.includes(value as AuthRole);
}

export function toAuthRole(
  value: unknown,
  fallback: AuthRole = 'user',
): AuthRole {
  return isAuthRole(value) ? value : fallback;
}

export type AuthUserDto = {
  id: string;
  email: string;
  role: AuthRole;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: AuthRole;
  tv: number;
};

export type AccessTokenPayload = AuthTokenPayload;
export type RefreshTokenPayload = AuthTokenPayload;

export function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    isAuthRole(payload.role) &&
    typeof payload.tv === 'number'
  );
}

export type AuthenticatedRequestUser = {
  userId: string;
  email?: string;
  role: AuthRole;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedRequestUser;
};

export type MetadataWithAuthUser = Metadata & {
  user?: AuthenticatedRequestUser;
};

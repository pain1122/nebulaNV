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

type AuthTokenPayloadBase = {
  sub: string;
  email: string;
  role: AuthRole;
  tv: number;
  sid: string;
  jti: string;
};

export type AccessTokenPayload = AuthTokenPayloadBase & {
  typ: 'access';
};

export type RefreshTokenPayload = AuthTokenPayloadBase & {
  typ: 'refresh';
};

export type AuthTokenPayload = AccessTokenPayload | RefreshTokenPayload;

export function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    isAuthRole(payload.role) &&
    typeof payload.tv === 'number' &&
    typeof payload.sid === 'string' &&
    payload.sid.length > 0 &&
    typeof payload.jti === 'string' &&
    payload.jti.length > 0 &&
    (payload.typ === 'access' || payload.typ === 'refresh')
  );
}

export function isAccessTokenPayload(
  value: unknown,
): value is AccessTokenPayload {
  return isAuthTokenPayload(value) && value.typ === 'access';
}

export function isRefreshTokenPayload(
  value: unknown,
): value is RefreshTokenPayload {
  return isAuthTokenPayload(value) && value.typ === 'refresh';
}

export type AuthenticatedRequestUser = {
  userId: string;
  email?: string;
  role: AuthRole;
  sessionRef?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedRequestUser;
};

export type MetadataWithAuthUser = Metadata & {
  user?: AuthenticatedRequestUser;
};

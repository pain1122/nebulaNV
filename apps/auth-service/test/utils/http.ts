// apps/auth-service/test/utils/http.ts
import * as jwt from 'jsonwebtoken';

export const AUTH_HTTP =
  process.env.AUTH_HTTP_URL ?? 'http://127.0.0.1:3001';

export type LoginResp = {
  accessToken: string;
  refreshToken: string;
};

export async function httpJson<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore parse errors; keep default message below
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

export function subFromJwt(token: string): string {
  const payload = jwt.decode(token) as jwt.JwtPayload | null;
  if (!payload?.sub) throw new Error('JWT missing sub');
  return String(payload.sub);
}

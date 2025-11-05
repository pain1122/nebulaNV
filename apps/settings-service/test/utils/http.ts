import * as jwt from 'jsonwebtoken';

export type HttpOk<T> = T;

export async function httpJson<T>(
  method: 'GET'|'POST'|'PUT'|'DELETE',
  url: string,
  body?: any,
  headers?: Record<string,string>
): Promise<T> {
  const baseHeaders: Record<string,string> = { 'content-type': 'application/json' };
  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try { json = await res.json(); } catch {}

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

export function decodeSub(token: string): string {
  const p = jwt.decode(token) as jwt.JwtPayload | null;
  if (!p?.sub) throw new Error('JWT missing sub');
  return String(p.sub);
}

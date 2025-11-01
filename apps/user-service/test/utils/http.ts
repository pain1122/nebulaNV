// apps/user-service/test/utils/http.ts
// Tiny HTTP helper + JWT utils for tests (Node 18+/22+ has global fetch)

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function httpJson<T = any>(
  method: HttpMethod,
  url: string,
  body?: any,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || res.statusText;
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} :: ${msg}`);
  }
  return json as T;
}

// ---------------- JWT helpers ----------------

function b64urlToUtf8(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return Buffer.from(s, 'base64').toString('utf8');
}

export function parseJwtPayload<T = any>(jwt: string): T {
  const parts = jwt.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  return JSON.parse(b64urlToUtf8(parts[1])) as T;
}

export function subFromJwt(jwt: string): string {
  const p = parseJwtPayload<{ sub?: string }>(jwt);
  if (!p.sub) throw new Error('JWT missing sub');
  return p.sub;
}

export function roleFromJwt(jwt: string): string | undefined {
  const p = parseJwtPayload<{ role?: string }>(jwt);
  return p.role;
}

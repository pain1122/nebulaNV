// apps/product-service/test/utils/http.ts
export async function httpJson<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD',
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<T> {
  const baseHeaders: Record<string, string> = { 'content-type': 'application/json' };

  const init: RequestInit = {
    method,
    headers: { ...baseHeaders, ...(headers ?? {}) },
  };

  // 🚫 no body on GET/HEAD
  if (body != null && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  let json: any = null;
  try {
    json = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

// ---- default product category helper ----

export async function getDefaultProductCategory() {
  const SETTINGS_HTTP = process.env.SETTINGS_HTTP_URL ?? "http://127.0.0.1:3010";

  // Must match DefaultProductTaxonomyInitializer
  const env = process.env.NODE_ENV || "default";

  const qs = new URLSearchParams({
    namespace: "product",
    environment: env,
    key: "default_product_category",
  }).toString();

  const res = await httpJson<{ value: string }>(
    "GET",
    `${SETTINGS_HTTP}/settings/string?${qs}`,
  );

  if (!res.value) {
    throw new Error("default_product_category missing in settings-service");
  }

  return res.value;
}


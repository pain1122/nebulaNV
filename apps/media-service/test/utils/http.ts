// apps/media-service/test/utils/http.ts
export async function httpJson<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<T> {
  const baseHeaders: Record<string, string> = {}
  if (body !== undefined) baseHeaders["content-type"] = "application/json"

  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...(headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      `${res.status} ${res.statusText}`
    throw new Error(msg)
  }

  return json as T
}

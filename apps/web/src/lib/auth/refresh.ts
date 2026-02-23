import { setTokens, clearTokens, loadTokens } from "./tokens"

export async function refreshAccessToken(): Promise<string> {
  loadTokens()

  const res = await fetch("/api/auth/refresh", {
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok || !json?.accessToken) {
    clearTokens()
    throw new Error(json?.message || "refresh_failed")
  }

  setTokens(json.accessToken)
  return json.accessToken
}

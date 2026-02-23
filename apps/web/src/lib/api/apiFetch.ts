import {getAccessToken, setTokens, clearTokens} from "@/lib/auth/tokens"
import {refreshAccessToken} from "@/lib/auth/refresh"

let isRefreshing = false
let pendingQueue: ((token: string) => void)[] = []

const AUTH_EXCLUDE = ["/api/auth/login"]

export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  // 🔐 Never intercept auth endpoints
  if (typeof input === "string") {
    if (input.startsWith("/api/auth/")) {
      return fetch(input, init)
    }
  }

  const token = getAccessToken()

  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
  })

  // ✅ happy path
  if (res.status !== 401) return res

  // 🔒 queue requests while refreshing
  if (isRefreshing) {
    return new Promise((resolve) => {
      pendingQueue.push((newToken) => {
        resolve(
          fetch(input, {
            ...init,
            headers: {
              ...(init.headers || {}),
              Authorization: `Bearer ${newToken}`,
            },
          }),
        )
      })
    })
  }

  isRefreshing = true

  try {
    // 🔹 use local refresh helper
    const newAccessToken = await refreshAccessToken()

    pendingQueue.forEach((cb) => cb(newAccessToken))
    pendingQueue = []

    return fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
      },
    })
  } finally {
    isRefreshing = false
  }
}

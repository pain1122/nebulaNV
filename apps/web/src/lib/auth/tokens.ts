const AT_KEY = "nebula:access"

let accessToken: string | null = null

export function loadTokens() {
  if (typeof window === "undefined") return

  accessToken = sessionStorage.getItem(AT_KEY)
}

export function setTokens(at: string) {
  accessToken = at

  if (typeof window !== "undefined") {
    sessionStorage.setItem(AT_KEY, at)
  }
}

export function getAccessToken() {
  return accessToken
}

export function clearTokens() {
  accessToken = null

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(AT_KEY)
  }
}

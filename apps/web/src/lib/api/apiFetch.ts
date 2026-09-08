import { clearTokens, getAccessToken } from "@/lib/auth/tokens";
import { refreshAccessToken } from "@/lib/auth/refresh";

let refreshInFlight: Promise<string> | undefined;

function withBearer(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return { ...init, headers };
}

function refreshedAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = undefined;
    });
  }
  return refreshInFlight;
}

export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  if (typeof input === "string" && input.startsWith("/api/auth/")) {
    return fetch(input, init);
  }

  const response = await fetch(input, withBearer(init, getAccessToken()));
  if (response.status !== 401) return response;

  try {
    const token = await refreshedAccessToken();
    return fetch(input, withBearer(init, token));
  } catch (error: unknown) {
    clearTokens();
    throw error;
  }
}

import { clearTokens, getAccessToken } from "./tokens";

export async function logoutSession(allDevices = false): Promise<void> {
  const accessToken = getAccessToken();
  const idempotencyKey = globalThis.crypto.randomUUID();
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(allDevices ? { allDevices: true } : {}),
    });
    if (!response.ok && response.status !== 401) {
      throw new Error("logout_failed");
    }
  } finally {
    clearTokens();
  }
}

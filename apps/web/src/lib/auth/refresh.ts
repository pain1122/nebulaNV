import { clearTokens, loadTokens, setTokens } from "./tokens";

export async function refreshAccessToken(): Promise<string> {
  loadTokens();
  const response = await fetch("/api/auth/refresh", { method: "POST" });
  const json = (await response.json().catch(() => ({}))) as {
    accessToken?: unknown;
    message?: unknown;
    error?: { message?: unknown };
  };
  if (!response.ok || typeof json.accessToken !== "string") {
    clearTokens();
    throw new Error(
      typeof json.message === "string"
        ? json.message
        : typeof json.error?.message === "string"
          ? json.error.message
          : "refresh_failed",
    );
  }
  setTokens(json.accessToken);
  return json.accessToken;
}

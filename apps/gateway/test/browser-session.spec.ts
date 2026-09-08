import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import {
  GATEWAY_REFRESH_COOKIE_NAME,
  GATEWAY_REFRESH_COOKIE_PATH,
  GatewayBrowserSessionService,
} from "../src/auth/browser-session";

function createService(nodeEnv: string): GatewayBrowserSessionService {
  return new GatewayBrowserSessionService({
    get: (name: string) => (name === "NODE_ENV" ? nodeEnv : undefined),
  } as ConfigService);
}

describe("GatewayBrowserSessionService cookie attributes", () => {
  it("uses production Secure and authoritative expiry without a Domain", () => {
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;
    createService("production").setRefreshCookie(
      response,
      "refresh-token",
      604800,
    );

    expect(cookie).toHaveBeenCalledWith(
      GATEWAY_REFRESH_COOKIE_NAME,
      "refresh-token",
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: GATEWAY_REFRESH_COOKIE_PATH,
        maxAge: 604800000,
      },
    );
    expect(cookie.mock.calls[0]?.[2]).not.toHaveProperty("domain");
  });

  it("deletes with the same scope-defining attributes", () => {
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;
    createService("development").clearRefreshCookie(response);

    expect(clearCookie).toHaveBeenCalledWith(GATEWAY_REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: GATEWAY_REFRESH_COOKIE_PATH,
    });
    expect(clearCookie.mock.calls[0]?.[1]).not.toHaveProperty("domain");
  });
});

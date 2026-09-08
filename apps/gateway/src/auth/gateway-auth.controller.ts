import { Body, Controller, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  gatewayActionEnvelope,
  gatewayItemEnvelope,
} from "../contracts/api-envelope";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayUserDto } from "../contracts/identity-api.dto";
import {
  GatewayAuthLoginRequestDto,
  GatewayAuthLogoutRequestDto,
  GatewayAuthLogoutResultDto,
  GatewayAuthRefreshRequestDto,
  GatewayAuthRegisterRequestDto,
  GatewayAuthTokenDto,
} from "./auth-api.dto";
import { GatewayBrowserSessionService } from "./browser-session";
import { GatewayAuthApiService } from "./gateway-auth-api.service";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

function publicTokenResult(
  token: GatewayAuthTokenDto & { refreshToken: string },
  browser: boolean,
): GatewayAuthTokenDto {
  return Object.freeze({
    accessToken: token.accessToken,
    ...(browser ? {} : { refreshToken: token.refreshToken }),
    accessExpiresInSeconds: token.accessExpiresInSeconds,
    refreshExpiresInSeconds: token.refreshExpiresInSeconds,
  });
}

@ApiTags("Auth")
@Controller()
export class GatewayAuthController {
  constructor(
    private readonly auth: GatewayAuthApiService,
    private readonly browserSession: GatewayBrowserSessionService,
  ) {}

  @GatewayApiRoute("auth.register", {
    requestType: GatewayAuthRegisterRequestDto,
    responseType: GatewayUserDto,
  })
  async register(
    @Req() request: GatewayHttpRequest,
    @Body() body: GatewayAuthRegisterRequestDto,
  ) {
    return gatewayItemEnvelope(
      await this.auth.register(request, {
        email: body.email,
        password: body.password,
      }),
      requestId(request),
    );
  }

  @GatewayApiRoute("auth.login", {
    requestType: GatewayAuthLoginRequestDto,
    responseType: GatewayAuthTokenDto,
    refreshCookie: "set",
  })
  async login(
    @Req() request: GatewayHttpRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() body: GatewayAuthLoginRequestDto,
  ) {
    const token = await this.auth.login(request, {
      identifier: body.identifier,
      password: body.password,
    });
    const browser = this.browserSession.isBrowser(request);
    if (browser) {
      this.browserSession.setRefreshCookie(
        response,
        token.refreshToken,
        token.refreshExpiresInSeconds,
      );
    }
    return gatewayActionEnvelope(
      publicTokenResult(token, browser),
      requestId(request),
    );
  }

  @GatewayApiRoute("auth.refresh", {
    requestType: GatewayAuthRefreshRequestDto,
    requestRequired: false,
    responseType: GatewayAuthTokenDto,
    refreshCookie: "set",
  })
  async refresh(
    @Req() request: GatewayHttpRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() body: GatewayAuthRefreshRequestDto | undefined,
  ) {
    const browser = this.browserSession.isBrowser(request);
    try {
      const refreshToken = this.browserSession.refreshTokenForRefresh(
        request,
        body?.refreshToken,
      );
      const token = await this.auth.refresh(request, refreshToken);
      if (browser) {
        this.browserSession.setRefreshCookie(
          response,
          token.refreshToken,
          token.refreshExpiresInSeconds,
        );
      }
      return gatewayActionEnvelope(
        publicTokenResult(token, browser),
        requestId(request),
      );
    } catch (error: unknown) {
      if (browser) this.browserSession.clearRefreshCookie(response);
      throw error;
    }
  }

  @GatewayApiRoute("auth.logout", {
    requestType: GatewayAuthLogoutRequestDto,
    requestRequired: false,
    responseType: GatewayAuthLogoutResultDto,
    refreshCookie: "clear",
  })
  async logout(
    @Req() request: GatewayHttpRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() body: GatewayAuthLogoutRequestDto | undefined,
  ) {
    const browser = this.browserSession.isBrowser(request);
    try {
      const refreshToken = this.browserSession.refreshTokenForLogout(
        request,
        body?.refreshToken,
        body?.allDevices === true,
      );
      return gatewayActionEnvelope(
        await this.auth.logout(request, {
          allDevices: body?.allDevices === true,
          refreshToken: refreshToken ?? "",
        }),
        requestId(request),
      );
    } finally {
      if (browser) this.browserSession.clearRefreshCookie(response);
    }
  }

  @GatewayApiRoute("auth.me", { responseType: GatewayUserDto })
  async profile(@Req() request: GatewayHttpRequest) {
    const userId = request.user?.userId;
    if (!userId) throw new Error("gateway_verified_actor_state_incomplete");
    return gatewayItemEnvelope(
      await this.auth.profile(request, userId),
      requestId(request),
    );
  }
}

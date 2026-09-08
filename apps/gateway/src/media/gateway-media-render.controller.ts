import { BadGatewayException, Controller, Logger, Param, Query, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { pipeline } from "node:stream/promises";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaRenderQueryDto } from "./media-api.dto";
import { GatewayMediaRenderProxy } from "./gateway-media-render.proxy";

const FORWARDED_RENDER_HEADERS = Object.freeze([
  "content-type",
  "content-length",
  "content-disposition",
  "cache-control",
  "etag",
  "x-content-type-options",
  "cross-origin-resource-policy",
] as const);

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Media Render")
@Controller()
export class GatewayMediaRenderController {
  private readonly logger = new Logger(GatewayMediaRenderController.name);

  constructor(private readonly proxy: GatewayMediaRenderProxy) {}

  @GatewayApiRoute("media.render", { queryType: GatewayMediaRenderQueryDto })
  async render(
    @Req() request: GatewayHttpRequest,
    @Res() response: Response,
    @Param() params: GatewayUuidPathDto,
    @Query() query: GatewayMediaRenderQueryDto,
  ): Promise<void> {
    const correlationId = requestId(request);
    let upstream;
    try {
      upstream = await this.proxy.open(params.id, query.variant, correlationId);
    } catch {
      throw new BadGatewayException("media_render_upstream_unavailable");
    }

    response.status(upstream.statusCode ?? 502);
    for (const header of FORWARDED_RENDER_HEADERS) {
      const value = upstream.headers[header];
      if (value !== undefined) response.setHeader(header, value);
    }

    try {
      await pipeline(upstream, response);
    } catch {
      this.logger.error(`media_render_stream_failed requestId=${correlationId}`);
      if (!response.headersSent) {
        throw new BadGatewayException("media_render_stream_failed");
      }
      response.destroy();
    }
  }
}

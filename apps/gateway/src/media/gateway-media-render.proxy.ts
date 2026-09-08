import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { get, type IncomingMessage } from "node:http";

const MEDIA_RENDER_HEADER_TIMEOUT_MS = 5_000;

@Injectable()
export class GatewayMediaRenderProxy {
  constructor(private readonly config: ConfigService) {}

  open(
    id: string,
    variant: "web" | undefined,
    requestId: string,
  ): Promise<IncomingMessage> {
    const base = this.config.getOrThrow<string>("MEDIA_RENDER_HTTP_URL");
    const target = new URL(`/media/render/${encodeURIComponent(id)}`, base);
    if (variant) target.searchParams.set("variant", variant);

    return new Promise((resolve, reject) => {
      const request = get(
        target,
        {
          headers: { "x-request-id": requestId },
        },
        resolve,
      );
      request.setTimeout(MEDIA_RENDER_HEADER_TIMEOUT_MS, () => {
        request.destroy(new Error("media_render_header_timeout"));
      });
      request.once("error", () => reject(new Error("media_render_upstream_unavailable")));
    });
  }
}
